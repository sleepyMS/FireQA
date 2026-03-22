import { openai, MODEL } from "./client";

export async function callOpenAIWithSchema<T>(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> }
): Promise<{ result: T; tokenUsage: number }> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: jsonSchema,
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI 응답이 비어있습니다.");

  return {
    result: JSON.parse(content) as T,
    tokenUsage: response.usage?.total_tokens ?? 0,
  };
}
