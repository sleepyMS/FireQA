export const wireframeJsonSchema = {
  name: "wireframe_generation",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      screens: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            id: { type: "string" as const },
            title: { type: "string" as const },
            description: { type: "string" as const },
            elements: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  type: {
                    type: "string" as const,
                    enum: [
                      "header",
                      "text",
                      "button",
                      "input",
                      "image",
                      "list",
                      "divider",
                      "nav",
                      "card",
                      "icon",
                    ],
                  },
                  label: { type: "string" as const },
                  variant: {
                    type: "string" as const,
                    enum: ["primary", "secondary", "outline", "ghost", "default"],
                  },
                },
                required: ["type", "label", "variant"],
                additionalProperties: false,
              },
            },
          },
          required: ["id", "title", "description", "elements"],
          additionalProperties: false,
        },
      },
      flows: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            from: { type: "string" as const },
            to: { type: "string" as const },
            label: { type: "string" as const },
            action: { type: "string" as const },
          },
          required: ["from", "to", "label", "action"],
          additionalProperties: false,
        },
      },
    },
    required: ["screens", "flows"],
    additionalProperties: false,
  },
};
