import { prisma } from "@/lib/db";
import { FlyMachinesClient } from "./client";
import { decrypt } from "@/lib/crypto/encrypt";

const WARM_POOL_MIN = parseInt(process.env.WARM_POOL_MIN ?? "2", 10);
const WARM_POOL_MAX = parseInt(process.env.WARM_POOL_MAX ?? "10", 10);
const IDLE_TIMEOUT_MS = parseInt(process.env.WORKER_IDLE_TIMEOUT_MS ?? "1800000", 10); // 30분
const MACHINE_HARD_TIMEOUT_MS = 30 * 60 * 1000; // 30분 최대 수명
const HEALTH_CHECK_STALE_MS = 3 * 60 * 1000; // 3분 응답 없으면 dead

export class WorkerOrchestrator {
  private fly: FlyMachinesClient;

  constructor() {
    this.fly = new FlyMachinesClient();
  }

  /** 작업에 워커 할당: idle Machine 재활용 또는 신규 생성 */
  async assignWorker(task: {
    id: string;
    organizationId: string;
    useOwnApiKey: boolean;
  }): Promise<{ machineId: string }> {
    // Anthropic API Key 결정
    let anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
    if (task.useOwnApiKey) {
      const userKey = await prisma.userApiKey.findUnique({
        where: { organizationId_provider: { organizationId: task.organizationId, provider: "anthropic" } },
      });
      if (!userKey) throw new Error("사용자 Anthropic API Key가 등록되지 않았습니다.");
      anthropicKey = decrypt(userKey.encryptedKey);
    }

    const env = this.buildBaseEnv(anthropicKey);

    const idleWorker = await prisma.hostedWorker.findFirst({
      where: { status: "idle" },
      orderBy: { updatedAt: "asc" },
    });

    let machineId: string;

    if (idleWorker) {
      machineId = idleWorker.flyMachineId;
      await prisma.hostedWorker.update({
        where: { id: idleWorker.id },
        data: { status: "busy", currentTaskId: task.id },
      });

      try {
        const machine = await this.fly.getMachine(machineId);
        if (machine.state === "stopped") {
          await this.fly.startMachine(machineId);
          await this.fly.waitForState(machineId, "started", 30_000);
        }
      } catch {
        await prisma.hostedWorker.update({
          where: { id: idleWorker.id },
          data: { status: "dead", currentTaskId: null },
        });
        machineId = await this.createNewWorker(env, task.id);
      }
    } else {
      machineId = await this.createNewWorker(env, task.id);
    }

    await prisma.agentTask.update({
      where: { id: task.id },
      data: { flyMachineId: machineId },
    });

    return { machineId };
  }

  private async createNewWorker(env: Record<string, string>, taskId: string | null): Promise<string> {
    const machine = await this.fly.createMachine({
      env,
      metadata: { ...(taskId ? { task_id: taskId } : {}), created_by: "orchestrator" },
    });

    await prisma.hostedWorker.create({
      data: {
        flyMachineId: machine.id,
        flyAppName: process.env.FLY_APP_NAME ?? "fireqa-workers",
        status: taskId ? "busy" : "idle",
        currentTaskId: taskId,
        region: machine.region,
      },
    });

    await this.fly.waitForState(machine.id, "started", 30_000);
    return machine.id;
  }

  /** 작업 완료 후 Machine 회수 — idle로 전환, 유휴 타임아웃 후 stop */
  async releaseWorker(machineId: string): Promise<void> {
    await prisma.hostedWorker.updateMany({
      where: { flyMachineId: machineId },
      data: { status: "idle", currentTaskId: null },
    });
  }

  private buildBaseEnv(anthropicKey?: string): Record<string, string> {
    return {
      FIREQA_SERVER: process.env.NEXT_PUBLIC_APP_URL ?? "https://fireqa.vercel.app",
      FIREQA_TOKEN: process.env.FLY_WORKER_SERVICE_TOKEN ?? "",
      FIREQA_MODE: "hosted",
      ANTHROPIC_API_KEY: anthropicKey ?? process.env.ANTHROPIC_API_KEY ?? "",
    };
  }

  private async stopWorker(worker: { id: string; flyMachineId: string }): Promise<void> {
    await this.fly.stopMachine(worker.flyMachineId);
    await prisma.hostedWorker.update({
      where: { id: worker.id },
      data: { status: "stopping", stoppedAt: new Date() },
    });
  }

  /** Warm 풀 관리: idle Machine 수를 MIN~MAX 범위로 유지 */
  async maintainWarmPool(): Promise<{ created: number; stopped: number }> {
    const idleWorkers = await prisma.hostedWorker.findMany({
      where: { status: "idle" },
      orderBy: { updatedAt: "asc" },
    });

    let created = 0;
    let stopped = 0;

    // idle이 부족하면 추가 생성
    if (idleWorkers.length < WARM_POOL_MIN) {
      const toCreate = WARM_POOL_MIN - idleWorkers.length;
      const createPromises = Array.from({ length: toCreate }, () =>
        this.createNewWorker(this.buildBaseEnv(), null).then(() => { created++; }).catch(() => {})
      );
      await Promise.allSettled(createPromises);
    }

    // 초과 idle + 유휴 타임아웃 대상을 수집하여 병렬 stop
    const now = Date.now();
    const workersToStop = [
      ...idleWorkers.slice(WARM_POOL_MAX),
      ...idleWorkers.slice(0, WARM_POOL_MAX).filter((w) => now - w.updatedAt.getTime() > IDLE_TIMEOUT_MS),
    ];
    const stopResults = await Promise.allSettled(
      workersToStop.map((w) => this.stopWorker(w))
    );
    stopped = stopResults.filter((r) => r.status === "fulfilled").length;

    return { created, stopped };
  }

  /** 건강 체크: 응답 없는 Machine 감지 + 정리 */
  async healthCheck(): Promise<{ checked: number; markedDead: number; destroyed: number }> {
    let checked = 0;
    let markedDead = 0;
    let destroyed = 0;

    // busy인데 오래 응답 없는 Machine → dead
    const busyWorkers = await prisma.hostedWorker.findMany({
      where: { status: "busy" },
    });

    const now = new Date();
    checked = busyWorkers.length;

    // 타임아웃된 busy 워커들을 병렬로 정리
    const timedOut = busyWorkers.filter((w) => now.getTime() - w.updatedAt.getTime() > MACHINE_HARD_TIMEOUT_MS);
    const deadResults = await Promise.allSettled(timedOut.map(async (worker) => {
      await this.fly.stopMachine(worker.flyMachineId).catch(() => {});
      await prisma.hostedWorker.update({
        where: { id: worker.id },
        data: { status: "dead", currentTaskId: null, stoppedAt: now },
      });
      if (worker.currentTaskId) {
        await prisma.agentTask.updateMany({
          where: { id: worker.currentTaskId, status: "running" },
          data: { status: "timed_out", completedAt: now, errorMessage: "호스티드 워커 시간 초과" },
        });
      }
    }));
    markedDead = deadResults.filter((r) => r.status === "fulfilled").length;

    // dead/stopping Machine 병렬 삭제
    const deadWorkers = await prisma.hostedWorker.findMany({
      where: { status: { in: ["dead", "stopping"] } },
    });
    const staleWorkers = deadWorkers.filter((w) => {
      const age = w.stoppedAt ? now.getTime() - w.stoppedAt.getTime() : HEALTH_CHECK_STALE_MS + 1;
      return age > HEALTH_CHECK_STALE_MS;
    });
    const destroyResults = await Promise.allSettled(staleWorkers.map(async (worker) => {
      await this.fly.destroyMachine(worker.flyMachineId).catch(() => {});
      await prisma.hostedWorker.delete({ where: { id: worker.id } });
    }));
    destroyed = destroyResults.filter((r) => r.status === "fulfilled").length;

    return { checked, markedDead, destroyed };
  }
}
