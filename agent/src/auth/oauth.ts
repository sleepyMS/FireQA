import { ConfigStore } from "../config/store.js";

const POLL_INTERVAL = 3000;
const MAX_WAIT_MS = 5 * 60 * 1000;

export async function loginWithOAuth(store: ConfigStore): Promise<void> {
  const config = store.load();

  // Step 1: Create device auth
  const createRes = await fetch(`${config.server}/api/auth/device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create" }),
  });

  if (!createRes.ok) {
    console.error("인증 요청 생성에 실패했습니다.");
    process.exit(1);
  }

  const { deviceCode } = (await createRes.json()) as { deviceCode: string };
  const verificationUrl = `${config.server}/auth/device?code=${deviceCode}&source=agent`;

  console.log("\n다음 단계를 따라 에이전트를 연결하세요:");
  console.log("\n1. 아래 URL을 브라우저에서 여세요:");
  console.log(`   ${verificationUrl}\n`);
  console.log("2. FireQA 계정으로 로그인 후 에이전트 연결을 승인하세요.");
  console.log("\n승인을 기다리는 중... (최대 5분)\n");

  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL);

    try {
      const pollRes = await fetch(
        `${config.server}/api/auth/device?code=${deviceCode}`
      );

      if (pollRes.status === 202) {
        // Still pending
        process.stdout.write(".");
        continue;
      }

      if (pollRes.ok) {
        const data = (await pollRes.json()) as {
          status: string;
          token: string;
          email?: string;
          name?: string;
        };
        if (data.status === "approved" && data.token) {
          store.setToken(data.token);
          console.log("\n\n인증 성공!");
          if (data.email) {
            console.log(`계정: ${data.email}`);
          }
          return;
        }
      }

      // Error or expired
      console.error("\n인증이 만료되었거나 거부되었습니다. 다시 시도해주세요.");
      process.exit(1);
    } catch {
      // Network error, retry
    }
  }

  console.error("\n인증 시간이 초과되었습니다. 다시 시도해주세요.");
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
