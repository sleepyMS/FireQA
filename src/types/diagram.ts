export interface DiagramNode {
  id: string;
  label: string;
  type: "screen" | "decision" | "action" | "start" | "end";
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface Diagram {
  title: string;
  type: "flowchart" | "stateDiagram" | "userFlow";
  mermaidCode: string;
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
}

export interface DiagramGenerationResult {
  diagrams: Diagram[];
}
