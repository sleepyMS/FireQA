import readline from "readline";
import { ConfigStore } from "../config/store.js";
import os from "os";

export async function loginWithApiKey(store: ConfigStore): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const token = await new Promise<string>((resolve) => {
    rl.question("API Key를 입력하세요 (fqa_...): ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!token.startsWith("fqa_")) {
    console.error("올바른 API Key 형식이 아닙니다. fqa_로 시작해야 합니다.");
    process.exit(1);
  }

  const config = store.load();
  const res = await fetch(`${config.server}/api/agent/connections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: `${process.env.USER ?? "agent"}@${os.hostname()}`,
      metadata: {
        cli: config.cli,
        os: process.platform,
        nodeVersion: process.version,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "알 수 없는 오류" }));
    console.error(`인증 실패: ${err.error}`);
    process.exit(1);
  }

  store.setToken(token);
  const data = await res.json();
  console.log(`인증 성공! 에이전트 "${data.name}" 등록됨.`);
}
