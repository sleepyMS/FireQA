import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto/encrypt";
import type { AIProvider } from "./provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

/**
 * 요청된 프로바이더에 따라 AIProvider 인스턴스를 생성한다.
 * - "anthropic": 조직의 UserApiKey에서 키를 조회/복호화하여 AnthropicProvider 생성
 * - 기본값: OpenAIProvider
 */
export async function resolveProvider(
  organizationId: string,
  requestedProvider?: string | null,
): Promise<AIProvider> {
  if (requestedProvider === "anthropic") {
    const record = await prisma.userApiKey.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: "anthropic",
        },
      },
    });

    if (!record) {
      throw new Error(
        "Anthropic API 키가 등록되지 않았습니다. 설정에서 API 키를 먼저 등록하세요.",
      );
    }

    const apiKey = decrypt(record.encryptedKey);
    return new AnthropicProvider(apiKey);
  }

  return new OpenAIProvider();
}
