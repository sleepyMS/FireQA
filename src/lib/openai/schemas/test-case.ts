export const testCaseJsonSchema = {
  name: "test_case_generation",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      sheets: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            sheetName: { type: "string" as const },
            category: { type: "string" as const },
            testCases: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  tcId: { type: "string" as const },
                  name: { type: "string" as const },
                  depth1: { type: "string" as const },
                  depth2: { type: "string" as const },
                  depth3: { type: "string" as const },
                  precondition: { type: "string" as const },
                  procedure: { type: "string" as const },
                  expectedResult: { type: "string" as const },
                },
                required: [
                  "tcId",
                  "name",
                  "depth1",
                  "depth2",
                  "depth3",
                  "precondition",
                  "procedure",
                  "expectedResult",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["sheetName", "category", "testCases"],
          additionalProperties: false,
        },
      },
    },
    required: ["sheets"],
    additionalProperties: false,
  },
};
