import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto/encrypt";
import type { AIProvider } from "./provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

export async function resolveProvider(
  organizationId: string,
  requestedModel?: string | null,
): Promise<AIProvider> {
  if (requestedModel === "claude-sonnet") {
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

  return new OpenAIProvider(requestedModel ?? undefined);
}
