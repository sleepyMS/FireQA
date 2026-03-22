export const diagramJsonSchema = {
  name: "diagram_generation",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      diagrams: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            title: { type: "string" as const },
            type: {
              type: "string" as const,
              enum: ["flowchart", "stateDiagram", "userFlow"],
            },
            mermaidCode: { type: "string" as const },
            nodes: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  id: { type: "string" as const },
                  label: { type: "string" as const },
                  type: {
                    type: "string" as const,
                    enum: ["screen", "decision", "action", "start", "end"],
                  },
                },
                required: ["id", "label", "type"],
                additionalProperties: false,
              },
            },
            edges: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  from: { type: "string" as const },
                  to: { type: "string" as const },
                  label: { type: "string" as const },
                },
                required: ["from", "to", "label"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "type", "mermaidCode", "nodes", "edges"],
          additionalProperties: false,
        },
      },
    },
    required: ["diagrams"],
    additionalProperties: false,
  },
};
