export const specImproveJsonSchema = {
  name: "spec_improvement",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      markdown: { type: "string" as const },
      summary: {
        type: "object" as const,
        properties: {
          totalSections: { type: "integer" as const },
          tableOfContents: {
            type: "array" as const,
            items: { type: "string" as const },
          },
          changeHighlights: {
            type: "array" as const,
            items: { type: "string" as const },
          },
        },
        required: ["totalSections", "tableOfContents", "changeHighlights"],
        additionalProperties: false,
      },
    },
    required: ["markdown", "summary"],
    additionalProperties: false,
  },
};
