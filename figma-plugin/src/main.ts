// FireQA FigJam Plugin - Main (runs in Figma sandbox)
import dagre from "dagre";

interface DiagramNode {
  id: string;
  label: string;
  type: "screen" | "decision" | "action" | "start" | "end";
}

interface DiagramEdge {
  from: string;
  to: string;
  label: string;
}

interface Diagram {
  title: string;
  type: string;
  mermaidCode: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

// 노드 타입별 색상
const NODE_COLORS: Record<string, { r: number; g: number; b: number }> = {
  screen: { r: 0.91, g: 0.94, b: 1 },
  decision: { r: 1, g: 0.95, b: 0.8 },
  action: { r: 0.83, g: 0.93, b: 0.85 },
  start: { r: 0.8, g: 0.9, b: 1 },
  end: { r: 0.97, g: 0.84, b: 0.86 },
};

// 레이아웃 상수
const NODE_W = 280;
const NODE_H = 100;
const DECISION_W = 320;
const DECISION_H = 190;
const DIAGRAM_X_OFFSET = 2500;

figma.showUI(__html__, { width: 400, height: 560 });

figma.ui.onmessage = async function (msg: {
  type: string;
  diagram?: Diagram;
  diagramIndex?: number;
  wireframeData?: WireframeData;
  key?: string;
  value?: string;
}) {
  // ─── clientStorage 중계 (플러그인 UI에서 직접 접근 불가) ───
  if (msg.type === "get-storage") {
    const value = await figma.clientStorage.getAsync(msg.key || "");
    figma.ui.postMessage({ type: "storage-result", key: msg.key, value });
    return;
  }

  if (msg.type === "set-storage") {
    await figma.clientStorage.setAsync(msg.key || "", msg.value || "");
    figma.ui.postMessage({ type: "storage-saved", key: msg.key });
    return;
  }

  if (msg.type === "clear-storage") {
    await figma.clientStorage.deleteAsync(msg.key || "");
    figma.ui.postMessage({ type: "storage-cleared", key: msg.key });
    return;
  }

  // ─── 브라우저 열기 (Device Auth 플로우) ───
  if (msg.type === "open-browser" && msg.value) {
    figma.openExternal(msg.value);
    return;
  }

  // ─── 다이어그램/와이어프레임 생성 ───
  if (msg.type === "create-diagram" && msg.diagram) {
    createDiagram(msg.diagram, msg.diagramIndex || 0)
      .then(function () {
        figma.ui.postMessage({ type: "success", message: "다이어그램이 생성되었습니다!" });
      })
      .catch(function (error) {
        figma.ui.postMessage({
          type: "error",
          message: "생성 실패: " + (error instanceof Error ? error.message : String(error)),
        });
      });
  }

  if (msg.type === "create-wireframe" && msg.wireframeData) {
    createWireframe(msg.wireframeData)
      .then(function () {
        figma.ui.postMessage({ type: "success", message: "와이어프레임이 생성되었습니다!" });
      })
      .catch(function (error) {
        figma.ui.postMessage({
          type: "error",
          message: "생성 실패: " + (error instanceof Error ? error.message : String(error)),
        });
      });
  }

  if (msg.type === "close") {
    figma.closePlugin();
  }
};

async function createDiagram(diagram: Diagram, diagramIndex: number) {
  const nodes = diagram.nodes;
  const edges = diagram.edges;
  const title = diagram.title;
  const xOffset = diagramIndex * DIAGRAM_X_OFFSET;

  if (!nodes || nodes.length === 0) {
    figma.notify("노드 데이터가 없습니다.");
    return;
  }

  // 폰트 로드
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
  ]);

  // dagre 레이아웃 계산
  const positions = calculateLayout(nodes, edges);

  // 생성된 노드 맵
  const createdNodes: Map<string, SceneNode> = new Map();

  // 타이틀 스티키노트
  try {
    const titleSticky = figma.createSticky();
    titleSticky.text.characters = title;
    titleSticky.x = xOffset;
    titleSticky.y = -150;
  } catch (e) {
    console.log("타이틀 스티키 생성 실패:", e);
  }

  // 노드 생성
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const pos = positions.get(node.id);
    if (!pos) continue;

    try {
      const shape = figma.createShapeWithText();

      if (node.type === "decision") {
        shape.shapeType = "DIAMOND";
      } else if (node.type === "start" || node.type === "end") {
        shape.shapeType = "ELLIPSE";
      } else {
        shape.shapeType = "ROUNDED_RECTANGLE";
      }

      shape.text.characters = node.label;

      const w = node.type === "decision" ? DECISION_W : NODE_W;
      const h = node.type === "decision" ? DECISION_H : NODE_H;
      shape.resize(w, h);

      shape.x = pos.x + xOffset;
      shape.y = pos.y;

      const color = NODE_COLORS[node.type] || { r: 1, g: 1, b: 1 };
      shape.fills = [{ type: "SOLID", color: color }];

      createdNodes.set(node.id, shape);
    } catch (e) {
      console.log("노드 생성 실패 [" + node.id + "]:", e);
      try {
        const fallback = figma.createSticky();
        fallback.text.characters = node.label;
        fallback.x = pos.x + xOffset;
        fallback.y = pos.y;
        createdNodes.set(node.id, fallback);
      } catch (e2) {
        console.log("대체 스티키도 실패:", e2);
      }
    }
  }

  // 커넥터 생성
  for (let j = 0; j < edges.length; j++) {
    const edge = edges[j];
    const fromNode = createdNodes.get(edge.from);
    const toNode = createdNodes.get(edge.to);

    if (!fromNode || !toNode) continue;

    try {
      const fromPos = positions.get(edge.from);
      const toPos = positions.get(edge.to);
      const magnets = getMagnets(fromPos, toPos);

      const connector = figma.createConnector();
      connector.connectorStart = {
        endpointNodeId: fromNode.id,
        magnet: magnets.start,
      };
      connector.connectorEnd = {
        endpointNodeId: toNode.id,
        magnet: magnets.end,
      };

      if (edge.label) {
        connector.text.characters = edge.label;
      }

      // 역방향 엣지는 CURVE, 정방향은 ELBOWED
      const dy = (toPos ? toPos.y : 0) - (fromPos ? fromPos.y : 0);
      connector.connectorLineType = dy < -80 ? "CURVE" : "ELBOWED";
    } catch (e) {
      console.log("커넥터 생성 실패 [" + edge.from + " -> " + edge.to + "]:", e);
    }
  }

  // 뷰포트 이동
  const allCreated = Array.from(createdNodes.values());
  if (allCreated.length > 0) {
    figma.viewport.scrollAndZoomIntoView(allCreated);
  }

  figma.notify(title + " 생성 완료 (" + nodes.length + "개 노드, " + edges.length + "개 연결)");
}

// 두 노드의 상대 위치에 따라 최적 magnet 방향 결정
function getMagnets(
  fromPos: { x: number; y: number } | undefined,
  toPos: { x: number; y: number } | undefined
): { start: "AUTO" | "TOP" | "BOTTOM" | "LEFT" | "RIGHT"; end: "AUTO" | "TOP" | "BOTTOM" | "LEFT" | "RIGHT" } {
  if (!fromPos || !toPos) return { start: "AUTO", end: "AUTO" };

  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;

  // 아래로 흐르는 정상 연결
  if (dy > 80) {
    if (Math.abs(dx) < 400) return { start: "BOTTOM", end: "TOP" };
    if (dx > 0) return { start: "RIGHT", end: "TOP" };
    return { start: "LEFT", end: "TOP" };
  }

  // 위로 돌아가는 역방향 연결 — 옆으로 크게 돌아감
  if (dy < -80) {
    if (dx >= 0) return { start: "RIGHT", end: "RIGHT" };
    return { start: "LEFT", end: "LEFT" };
  }

  // 같은 레벨 수평 연결
  if (dx > 0) return { start: "RIGHT", end: "LEFT" };
  if (dx < 0) return { start: "LEFT", end: "RIGHT" };

  return { start: "AUTO", end: "AUTO" };
}

// dagre 레이아웃 (교차 최소화 + 노드 크기 인식)
function calculateLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 200,        // 같은 레벨 노드 간 가로 간격
    ranksep: 250,        // 레벨 간 세로 간격
    edgesep: 100,        // 엣지 간 간격
    marginx: 60,
    marginy: 60,
    ranker: "network-simplex",  // 최적 레이어 할당
  });
  g.setDefaultEdgeLabel(function () { return {}; });

  // 노드 추가
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const w = node.type === "decision" ? DECISION_W : NODE_W;
    const h = node.type === "decision" ? DECISION_H : NODE_H;
    g.setNode(node.id, { width: w, height: h });
  }

  // 엣지 추가 (중복 제거)
  const edgeSet: Record<string, boolean> = {};
  for (let j = 0; j < edges.length; j++) {
    const key = edges[j].from + "->" + edges[j].to;
    if (!edgeSet[key]) {
      edgeSet[key] = true;
      g.setEdge(edges[j].from, edges[j].to);
    }
  }

  // dagre 레이아웃 실행
  dagre.layout(g);

  // 결과 좌표 추출 (dagre는 중심 좌표 반환 → 좌상단으로 변환)
  g.nodes().forEach(function (nodeId: string) {
    const n = g.node(nodeId);
    if (n) {
      positions.set(nodeId, {
        x: n.x - n.width / 2,
        y: n.y - n.height / 2,
      });
    }
  });

  return positions;
}

// ========== 와이어프레임 생성 ==========

interface WireframeElement {
  type: string;
  label: string;
  variant: string;
  width?: string;         // "full" | "half" | "third"
  sublabel?: string | null;
}

interface WireframeScreen {
  id: string;
  title: string;
  description: string;
  screenType?: string;
  step?: number;
  elements: WireframeElement[];
}

interface WireframeFlow {
  from: string;
  to: string;
  label: string;
  action: string;
  fromElement?: string | null;
}

interface WireframeData {
  screens: WireframeScreen[];
  flows: WireframeFlow[];
}

const SCREEN_WIDTHS: Record<string, number> = {
  mobile: 360,
  desktop: 800,
  modal: 480,
  toast: 320,
};
const SCREEN_PADDING = 24;
const ELEMENT_GAP = 10;
const COL_GAP = 8;
const STEP_X_GAP = 200;
const SAME_STEP_Y_GAP = 80;
const MAX_STEPS_PER_ROW = 5;
const ROW_GAP = 150;

const ELEMENT_STYLES: Record<string, { h: number; fill: { r: number; g: number; b: number }; radius: number }> = {
  header:   { h: 48,  fill: { r: 0.15, g: 0.15, b: 0.15 }, radius: 0 },
  nav:      { h: 44,  fill: { r: 0.96, g: 0.96, b: 0.98 }, radius: 8 },
  text:     { h: 24,  fill: { r: 1,    g: 1,    b: 1    }, radius: 0 },
  input:    { h: 44,  fill: { r: 0.97, g: 0.97, b: 0.97 }, radius: 8 },
  search:   { h: 44,  fill: { r: 0.97, g: 0.97, b: 0.97 }, radius: 22 },
  button:   { h: 44,  fill: { r: 0.2,  g: 0.4,  b: 1    }, radius: 10 },
  image:    { h: 120, fill: { r: 0.92, g: 0.92, b: 0.95 }, radius: 8 },
  list:     { h: 56,  fill: { r: 0.98, g: 0.98, b: 0.99 }, radius: 6 },
  card:     { h: 88,  fill: { r: 0.96, g: 0.97, b: 1    }, radius: 12 },
  divider:  { h: 1,   fill: { r: 0.88, g: 0.88, b: 0.88 }, radius: 0 },
  icon:     { h: 32,  fill: { r: 1,    g: 1,    b: 1    }, radius: 0 },
  tabs:     { h: 44,  fill: { r: 1,    g: 1,    b: 1    }, radius: 0 },
  dropdown: { h: 44,  fill: { r: 0.97, g: 0.97, b: 0.97 }, radius: 8 },
  checkbox: { h: 28,  fill: { r: 1,    g: 1,    b: 1    }, radius: 0 },
  radio:    { h: 28,  fill: { r: 1,    g: 1,    b: 1    }, radius: 0 },
  toggle:   { h: 28,  fill: { r: 1,    g: 1,    b: 1    }, radius: 0 },
  badge:    { h: 22,  fill: { r: 0.2,  g: 0.4,  b: 1    }, radius: 11 },
  table:    { h: 124, fill: { r: 0.98, g: 0.98, b: 0.99 }, radius: 6 },
  progress: { h: 28,  fill: { r: 1,    g: 1,    b: 1    }, radius: 0 },
};

// ─── Figma 요소 생성 헬퍼 ─────────────────────────────────────────────────────

function makeRect(
  frame: FrameNode,
  x: number, y: number, w: number, h: number,
  fill: { r: number; g: number; b: number },
  radius?: number,
  strokeColor?: { r: number; g: number; b: number },
  strokeWeight?: number
): RectangleNode {
  const rect = figma.createRectangle();
  rect.resize(w, h);
  rect.fills = [{ type: "SOLID", color: fill }];
  if (radius !== undefined) rect.cornerRadius = radius;
  if (strokeColor) {
    rect.strokeWeight = strokeWeight || 1;
    rect.strokes = [{ type: "SOLID", color: strokeColor }];
  }
  frame.appendChild(rect);
  rect.x = x;
  rect.y = y;
  return rect;
}

function makeText(
  frame: FrameNode,
  x: number, y: number,
  chars: string,
  size: number,
  weight: "Bold" | "Medium" | "Regular",
  color: { r: number; g: number; b: number },
  fixedW?: number, fixedH?: number,
  alignH?: "LEFT" | "CENTER" | "RIGHT",
  alignV?: "TOP" | "CENTER" | "BOTTOM"
): TextNode {
  const txt = figma.createText();
  txt.characters = chars;
  txt.fontSize = size;
  txt.fontName = { family: "Inter", style: weight };
  txt.fills = [{ type: "SOLID", color: color }];
  if (fixedW !== undefined && fixedH !== undefined) txt.resize(fixedW, fixedH);
  if (alignH) txt.textAlignHorizontal = alignH;
  if (alignV) txt.textAlignVertical = alignV;
  frame.appendChild(txt);
  txt.x = x;
  txt.y = y;
  return txt;
}

function getElementHeight(elem: WireframeElement): number {
  if (elem.type === "card") return elem.sublabel ? 88 : 70;
  if (elem.type === "list") return elem.sublabel ? 56 : 44;
  return (ELEMENT_STYLES[elem.type] || ELEMENT_STYLES.text).h;
}

// 공유 색상 상수
const C_WHITE =   { r: 1,    g: 1,    b: 1    };
const C_BLUE  =   { r: 0.2,  g: 0.4,  b: 1    };
const C_DARK  =   { r: 0.25, g: 0.25, b: 0.3  };
const C_MUTED =   { r: 0.5,  g: 0.5,  b: 0.55 };
const C_GRAY_TXT= { r: 0.6,  g: 0.6,  b: 0.6  };
const C_BORDER =  { r: 0.9,  g: 0.9,  b: 0.92 };
const C_CHEVRON = { r: 0.65, g: 0.65, b: 0.7  };

// ─────────────────────────────────────────────────────────────────────────────

function groupElementsIntoRows(
  elements: WireframeElement[]
): Array<{ items: WireframeElement[] }> {
  const rows: Array<{ items: WireframeElement[] }> = [];
  let i = 0;
  while (i < elements.length) {
    const el = elements[i];
    const w = el.width || "full";
    if (w === "full") {
      rows.push({ items: [el] });
      i++;
    } else {
      const maxCols = w === "half" ? 2 : 3;
      const group: WireframeElement[] = [el];
      while (
        group.length < maxCols &&
        i + group.length < elements.length &&
        (elements[i + group.length].width || "full") === w
      ) {
        group.push(elements[i + group.length]);
      }
      rows.push({ items: group });
      i += group.length;
    }
  }
  return rows;
}

function calculateScreenHeight(rows: Array<{ items: WireframeElement[] }>): number {
  let h = 44 + SCREEN_PADDING;
  for (let ri = 0; ri < rows.length; ri++) {
    let maxH = 0;
    const items = rows[ri].items;
    for (let ii = 0; ii < items.length; ii++) {
      const eh = getElementHeight(items[ii]);
      if (eh > maxH) maxH = eh;
    }
    h += maxH + ELEMENT_GAP;
  }
  return Math.max(h + SCREEN_PADDING, 300);
}

function renderElement(
  frame: FrameNode,
  elem: WireframeElement,
  x: number, y: number, w: number
): number {
  const type = elem.type;
  const label = elem.label || "";
  const variant = elem.variant || "default";
  const sublabel = elem.sublabel || null;
  const style = ELEMENT_STYLES[type] || ELEMENT_STYLES.text;
  const h = getElementHeight(elem);

  if (type === "divider") {
    makeRect(frame, x, y, w, 1, style.fill);
    return 1;
  }

  if (type === "header") {
    makeRect(frame, x, y, w, h, style.fill);
    makeText(frame, SCREEN_PADDING, y + Math.floor((h - 14) / 2), label, 14, "Bold", C_WHITE);
    return h;
  }

  if (type === "button") {
    const isOutline = variant === "outline" || variant === "ghost";
    const btnFill = isOutline ? C_WHITE :
                  variant === "secondary" ? { r: 0.93, g: 0.93, b: 0.96 } : style.fill;
    makeRect(frame, x, y, w, h, btnFill, style.radius,
      isOutline ? C_BLUE : undefined, isOutline ? 1.5 : undefined);
    const btnTextColor = isOutline ? C_BLUE :
                       variant === "secondary" ? { r: 0.25, g: 0.25, b: 0.3 } : C_WHITE;
    makeText(frame, x, y, label, 13, "Medium", btnTextColor, w, h, "CENTER", "CENTER");
    return h;
  }

  if (type === "input" || type === "search" || type === "dropdown") {
    makeRect(frame, x, y, w, h, style.fill, style.radius, { r: 0.82, g: 0.82, b: 0.82 });
    let textX = x + 12;
    if (type === "search") {
      makeText(frame, x + 12, y + Math.floor((h - 12) / 2), "○", 11, "Regular", C_MUTED);
      textX = x + 28;
    }
    makeText(frame, textX, y + Math.floor((h - 14) / 2), label, 12, "Regular", C_GRAY_TXT);
    if (type === "dropdown") {
      makeText(frame, x + w - 20, y + Math.floor((h - 12) / 2), "▾", 11, "Regular", C_MUTED);
    }
    return h;
  }

  if (type === "image") {
    makeRect(frame, x, y, w, h, style.fill, style.radius);
    makeText(frame, x, y, label || "이미지", 11, "Regular", C_MUTED, w, h, "CENTER", "CENTER");
    return h;
  }

  if (type === "tabs") {
    const tabNames = label.split(",").map(function (s: string) { return s.trim(); });
    makeRect(frame, x, y + h - 1, w, 1, { r: 0.88, g: 0.88, b: 0.88 });
    const tabW = Math.floor(w / tabNames.length);
    for (let ti = 0; ti < tabNames.length; ti++) {
      const isActive = ti === 0;
      makeText(frame, x + ti * tabW, y, tabNames[ti], 13, isActive ? "Medium" : "Regular",
        isActive ? C_BLUE : C_MUTED, tabW, h, "CENTER", "CENTER");
      if (isActive) makeRect(frame, x + ti * tabW, y + h - 2, tabW, 2, C_BLUE);
    }
    return h;
  }

  if (type === "checkbox" || type === "radio") {
    const ctrlY = y + Math.floor((h - 16) / 2);
    if (type === "checkbox") {
      makeRect(frame, x, ctrlY, 16, 16, C_WHITE, 3, { r: 0.6, g: 0.6, b: 0.65 }, 1.5);
    } else {
      const circle = figma.createEllipse();
      circle.resize(16, 16);
      circle.fills = [{ type: "SOLID", color: C_WHITE }];
      circle.strokeWeight = 1.5;
      circle.strokes = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.65 } }];
      frame.appendChild(circle);
      circle.x = x;
      circle.y = ctrlY;
    }
    makeText(frame, x + 24, y + Math.floor((h - 14) / 2), label, 12, "Regular", { r: 0.2, g: 0.2, b: 0.25 });
    return h;
  }

  if (type === "toggle") {
    const isOn = variant === "primary";
    makeRect(frame, x, y + Math.floor((h - 20) / 2), 36, 20,
      isOn ? C_BLUE : { r: 0.75, g: 0.75, b: 0.78 }, 10);
    const thumb = figma.createEllipse();
    thumb.resize(16, 16);
    thumb.fills = [{ type: "SOLID", color: C_WHITE }];
    frame.appendChild(thumb);
    thumb.x = isOn ? x + 18 : x + 2;
    thumb.y = y + Math.floor((h - 16) / 2);
    makeText(frame, x + 44, y + Math.floor((h - 14) / 2), label, 12, "Regular", { r: 0.2, g: 0.2, b: 0.25 });
    return h;
  }

  if (type === "badge") {
    const badgeW = Math.max(label.length * 7 + 16, 40);
    const isBadgeOutline = variant === "outline";
    const badgeFill = isBadgeOutline ? C_WHITE :
                    variant === "secondary" ? { r: 0.85, g: 0.85, b: 0.88 } : C_BLUE;
    makeRect(frame, x, y, badgeW, h, badgeFill, style.radius,
      isBadgeOutline ? { r: 0.6, g: 0.6, b: 0.65 } : undefined);
    makeText(frame, x, y, label, 10, "Medium",
      variant === "primary" ? C_WHITE : { r: 0.3, g: 0.3, b: 0.35 },
      badgeW, h, "CENTER", "CENTER");
    return h;
  }

  if (type === "progress") {
    makeText(frame, x, y, label, 11, "Regular", { r: 0.35, g: 0.35, b: 0.4 });
    makeRect(frame, x, y + 16, w, 6, { r: 0.9, g: 0.9, b: 0.92 }, 3);
    makeRect(frame, x, y + 16, Math.floor(w / 2), 6, C_BLUE, 3);
    return h;
  }

  if (type === "table") {
    const colHeaders = label.split(",").map(function (s: string) { return s.trim(); });
    const colCount = Math.max(colHeaders.length, 2);
    const colW = Math.floor(w / colCount);
    const rowH = 30;
    makeRect(frame, x, y, w, rowH, { r: 0.93, g: 0.93, b: 0.96 }, style.radius);
    for (let ci = 0; ci < colCount; ci++) {
      makeText(frame, x + ci * colW + 8, y + 8,
        colHeaders[ci] || ("컬럼" + (ci + 1)), 11, "Medium", { r: 0.25, g: 0.25, b: 0.3 });
    }
    for (let ri = 1; ri <= 3; ri++) {
      makeRect(frame, x, y + ri * rowH, w, 1, { r: 0.9, g: 0.9, b: 0.92 });
      for (let rci = 0; rci < colCount; rci++) {
        makeRect(frame, x + rci * colW + 8, y + ri * rowH + 11,
          Math.floor(colW * 0.6), 8, { r: 0.88, g: 0.88, b: 0.9 }, 4);
      }
    }
    return style.h;
  }

  if (type === "card") {
    makeRect(frame, x, y, w, h, style.fill, style.radius, { r: 0.88, g: 0.88, b: 0.92 });
    makeText(frame, x + 12, y + (sublabel ? 12 : Math.floor((h - 14) / 2)),
      label, 12, "Medium", { r: 0.1, g: 0.1, b: 0.15 });
    if (sublabel) makeText(frame, x + 12, y + 32, sublabel, 11, "Regular", C_MUTED);
    makeText(frame, x + w - 20, y + Math.floor((h - 16) / 2), "›", 16, "Regular", C_CHEVRON);
    return h;
  }

  if (type === "list") {
    makeRect(frame, x, y, w, h, style.fill, style.radius, C_BORDER);
    makeRect(frame, x + 8, y + 4, 3, h - 8, { r: 0.6, g: 0.72, b: 1 }, 2);
    makeText(frame, x + 20, y + (sublabel ? 8 : Math.floor((h - 14) / 2)),
      label, 12, "Medium", { r: 0.15, g: 0.15, b: 0.2 });
    if (sublabel) makeText(frame, x + 20, y + 26, sublabel, 10, "Regular", C_MUTED);
    makeText(frame, x + w - 18, y + Math.floor((h - 14) / 2), "›", 14, "Regular", C_CHEVRON);
    return h;
  }

  if (type === "nav") {
    makeRect(frame, x, y, w, h, style.fill, style.radius, C_BORDER);
    makeText(frame, x + 12, y + Math.floor((h - 14) / 2), label, 12, "Medium", C_DARK);
    return h;
  }

  makeText(frame, x, y + 4, label, 12, "Regular", C_DARK);
  return h;
}

async function createWireframe(data: WireframeData) {
  const screens = data.screens;
  const flows = data.flows;

  if (!screens || screens.length === 0) {
    figma.notify("화면 데이터가 없습니다.");
    return;
  }

  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
  ]);

  const isFigJam = figma.editorType === "figjam";

  // 화면별 너비/높이/행 그룹 계산 (행 그룹은 높이 계산과 렌더링에서 공유)
  const screenWidths: Record<string, number> = {};
  const screenHeights: Record<string, number> = {};
  const screenRowsMap: Record<string, Array<{ items: WireframeElement[] }>> = {};

  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    screenWidths[s.id] = SCREEN_WIDTHS[s.screenType || "desktop"] || SCREEN_WIDTHS.desktop;
    const sRows = groupElementsIntoRows(s.elements);
    screenRowsMap[s.id] = sRows;
    screenHeights[s.id] = calculateScreenHeight(sRows);
  }

  // step 기반 좌→우 배치 (같은 step은 세로로 나열)
  let stepGroups: Record<number, WireframeScreen[]> = {};
  for (let si2 = 0; si2 < screens.length; si2++) {
    const step = screens[si2].step || 1;
    if (!stepGroups[step]) stepGroups[step] = [];
    stepGroups[step].push(screens[si2]);
  }

  let sortedSteps = Object.keys(stepGroups).map(Number).sort(function (a, b) { return a - b; });

  // AI가 모든 화면에 동일한 step을 할당한 경우 index 순으로 분배
  if (sortedSteps.length === 1) {
    const flatScreens = stepGroups[sortedSteps[0]];
    stepGroups = {};
    for (let fi = 0; fi < flatScreens.length; fi++) {
      stepGroups[fi + 1] = [flatScreens[fi]];
    }
    sortedSteps = Object.keys(stepGroups).map(Number).sort(function (a, b) { return a - b; });
  }

  const screenPositions = new Map<string, { x: number; y: number }>();
  const createdFrames = new Map<string, SceneNode>();
  // 화면 내 요소 레이블 → 프레임 기준 중앙 Y (flow 화살표 출발점에 사용)
  const elementYMap: Record<string, Record<string, number>> = {};

  // MAX_STEPS_PER_ROW 단위로 줄 바꿈
  let rowBaseY = 0;
  for (let rowStart = 0; rowStart < sortedSteps.length; rowStart += MAX_STEPS_PER_ROW) {
    const rowSteps = sortedSteps.slice(rowStart, rowStart + MAX_STEPS_PER_ROW);
    let curX = 0;
    let rowMaxH = 0;

    for (let stepIdx = 0; stepIdx < rowSteps.length; stepIdx++) {
      const stepNum = rowSteps[stepIdx];
      const group = stepGroups[stepNum];
      let maxW = 0;
      for (let gi = 0; gi < group.length; gi++) {
        const gw = screenWidths[group[gi].id] || 360;
        if (gw > maxW) maxW = gw;
      }
      let stepY = rowBaseY;
      let colH = 0;
      for (let gj = 0; gj < group.length; gj++) {
        screenPositions.set(group[gj].id, { x: curX, y: stepY });
        colH += screenHeights[group[gj].id] + (gj < group.length - 1 ? SAME_STEP_Y_GAP : 0);
        stepY += screenHeights[group[gj].id] + SAME_STEP_Y_GAP;
      }
      if (colH > rowMaxH) rowMaxH = colH;
      curX += maxW + STEP_X_GAP;
    }

    rowBaseY += rowMaxH + ROW_GAP;
  }

  // 각 화면 생성
  for (let si = 0; si < screens.length; si++) {
    const screen = screens[si];
    const pos = screenPositions.get(screen.id);
    if (!pos) continue;
    const screenH = screenHeights[screen.id];
    const screenW = screenWidths[screen.id] || 360;

    try {
      const frame = figma.createFrame();
      frame.name = screen.title;
      frame.resize(screenW, screenH);
      frame.x = pos.x;
      frame.y = pos.y;
      frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      frame.cornerRadius = 16;
      frame.strokeWeight = 1;
      frame.strokes = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
      frame.clipsContent = true;

      // 프레임 위 라벨
      const stepLabel = screen.step ? "Step " + screen.step + " · " : "";
      const typeLabel = screen.screenType ? " [" + screen.screenType + "]" : "";
      const titleLabel = figma.createText();
      titleLabel.characters = stepLabel + screen.title + typeLabel;
      titleLabel.fontSize = 13;
      titleLabel.fontName = { family: "Inter", style: "Bold" };
      titleLabel.fills = [{ type: "SOLID", color: { r: 0.35, g: 0.35, b: 0.45 } }];
      titleLabel.x = pos.x;
      titleLabel.y = pos.y - 24;

      // 상태바
      makeRect(frame, 0, 0, screenW, 44, { r: 0.97, g: 0.97, b: 0.97 });
      makeText(frame, SCREEN_PADDING, 15, screen.title, 13, "Medium", { r: 0.1, g: 0.1, b: 0.1 });

      let curY = 44 + SCREEN_PADDING;
      const rows = screenRowsMap[screen.id];
      elementYMap[screen.id] = {};

      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri];
        const items = row.items;
        let maxElemH = 0;

        if (items.length === 1) {
          const isFullBleed = items[0].type === "header";
          const elemH = renderElement(
            frame, items[0],
            isFullBleed ? 0 : SCREEN_PADDING,
            curY,
            isFullBleed ? screenW : screenW - SCREEN_PADDING * 2
          );
          maxElemH = elemH;
          elementYMap[screen.id][items[0].label] = curY + elemH / 2;
        } else {
          const colCount = items.length;
          const totalGap = COL_GAP * (colCount - 1);
          const colW = Math.floor((screenW - SCREEN_PADDING * 2 - totalGap) / colCount);
          let colX = SCREEN_PADDING;
          for (let ci = 0; ci < items.length; ci++) {
            const colElemH = renderElement(frame, items[ci], colX, curY, colW);
            if (colElemH > maxElemH) maxElemH = colElemH;
            elementYMap[screen.id][items[ci].label] = curY + colElemH / 2;
            colX += colW + COL_GAP;
          }
        }

        curY += maxElemH + ELEMENT_GAP;
      }

      createdFrames.set(screen.id, frame);
    } catch (e) {
      console.log("화면 생성 실패 [" + screen.id + "]:", e);
    }
  }

  // 흐름 화살표 생성
  for (let fj = 0; fj < flows.length; fj++) {
    const flow = flows[fj];
    const fromFrame = createdFrames.get(flow.from);
    const toFrame = createdFrames.get(flow.to);
    if (!fromFrame || !toFrame) continue;

    try {
      if (isFigJam) {
        const connector = figma.createConnector();
        connector.connectorStart = { endpointNodeId: fromFrame.id, magnet: "RIGHT" as ConnectorMagnet };
        connector.connectorEnd = { endpointNodeId: toFrame.id, magnet: "LEFT" as ConnectorMagnet };
        connector.connectorLineType = "CURVE";
        if (flow.label) connector.text.characters = flow.label;
      } else {
        const fromPos2 = screenPositions.get(flow.from);
        const toPos2 = screenPositions.get(flow.to);
        if (!fromPos2 || !toPos2) continue;

        const fromScreenW = screenWidths[flow.from] || 360;
        const fromX = fromPos2.x + fromScreenW;
        const elemMap = elementYMap[flow.from];
        const elemCenterY = (flow.fromElement && elemMap && elemMap[flow.fromElement] !== undefined)
          ? elemMap[flow.fromElement]
          : (screenHeights[flow.from] || 300) / 2;
        const fromY = fromPos2.y + elemCenterY;
        const toX = toPos2.x;
        const toY = toPos2.y + (screenHeights[flow.to] || 300) / 2;

        const line = figma.createLine();
        const dx = toX - fromX;
        const dy = toY - fromY;
        const len = Math.sqrt(dx * dx + dy * dy);
        line.resize(len, 0);
        line.x = fromX;
        line.y = fromY;
        line.rotation = -Math.atan2(dy, dx) * (180 / Math.PI);
        line.strokes = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.7 } }];
        line.strokeWeight = 1.5;

        if (flow.label) {
          const flowLabel = figma.createText();
          flowLabel.characters = flow.label;
          flowLabel.fontSize = 10;
          flowLabel.fontName = { family: "Inter", style: "Regular" };
          flowLabel.fills = [{ type: "SOLID", color: { r: 0.45, g: 0.45, b: 0.55 } }];
          flowLabel.x = (fromX + toX) / 2;
          flowLabel.y = (fromY + toY) / 2 - 16;
        }
      }
    } catch (e) {
      console.log("흐름 생성 실패:", e);
    }
  }

  const allFrames = Array.from(createdFrames.values());
  if (allFrames.length > 0) {
    figma.viewport.scrollAndZoomIntoView(allFrames);
  }

  figma.notify("와이어프레임 생성 완료 (" + screens.length + "개 화면, " + flows.length + "개 흐름)");
}
