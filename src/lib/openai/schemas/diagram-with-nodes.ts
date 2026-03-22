// AI가 mermaidCode + nodes + edges를 동시에 반환할 때 사용하는 스키마
export const diagramWithNodesSchema = {
  name: "diagram_with_nodes",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
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
    required: ["mermaidCode", "nodes", "edges"],
    additionalProperties: false,
  },
};

export const MERMAID_RULES = `Mermaid 구문 규칙 (반드시 준수):
- 한국어 레이블은 반드시 ["..."] 로 감싸세요.
- 레이블 안에 괄호 ()를 절대 쓰지 마세요. 필요하면 " - "로 대체하세요.
- (( )) 이중괄호 대신 (["..."]) 를 사용하세요.

nodes/edges 규칙:
- nodes의 id는 mermaidCode의 노드 ID와 정확히 일치해야 합니다.
- type: 시작/끝="start"/"end", 분기(다이아몬드)="decision", 화면/페이지="screen", 행동/처리="action"
- edges의 from/to는 nodes의 id를 참조합니다.`;
