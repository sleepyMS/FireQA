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
var NODE_COLORS: Record<string, { r: number; g: number; b: number }> = {
  screen: { r: 0.91, g: 0.94, b: 1 },
  decision: { r: 1, g: 0.95, b: 0.8 },
  action: { r: 0.83, g: 0.93, b: 0.85 },
  start: { r: 0.8, g: 0.9, b: 1 },
  end: { r: 0.97, g: 0.84, b: 0.86 },
};

// 레이아웃 상수
var NODE_W = 280;
var NODE_H = 100;
var DECISION_W = 320;
var DECISION_H = 190;
var DIAGRAM_X_OFFSET = 2500;

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
  var nodes = diagram.nodes;
  var edges = diagram.edges;
  var title = diagram.title;
  var xOffset = diagramIndex * DIAGRAM_X_OFFSET;

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
  var positions = calculateLayout(nodes, edges);

  // 생성된 노드 맵
  var createdNodes: Map<string, SceneNode> = new Map();

  // 타이틀 스티키노트
  try {
    var titleSticky = figma.createSticky();
    titleSticky.text.characters = title;
    titleSticky.x = xOffset;
    titleSticky.y = -150;
  } catch (e) {
    console.log("타이틀 스티키 생성 실패:", e);
  }

  // 노드 생성
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var pos = positions.get(node.id);
    if (!pos) continue;

    try {
      var shape = figma.createShapeWithText();

      if (node.type === "decision") {
        shape.shapeType = "DIAMOND";
      } else if (node.type === "start" || node.type === "end") {
        shape.shapeType = "ELLIPSE";
      } else {
        shape.shapeType = "ROUNDED_RECTANGLE";
      }

      shape.text.characters = node.label;

      var w = node.type === "decision" ? DECISION_W : NODE_W;
      var h = node.type === "decision" ? DECISION_H : NODE_H;
      shape.resize(w, h);

      shape.x = pos.x + xOffset;
      shape.y = pos.y;

      var color = NODE_COLORS[node.type] || { r: 1, g: 1, b: 1 };
      shape.fills = [{ type: "SOLID", color: color }];

      createdNodes.set(node.id, shape);
    } catch (e) {
      console.log("노드 생성 실패 [" + node.id + "]:", e);
      try {
        var fallback = figma.createSticky();
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
  for (var j = 0; j < edges.length; j++) {
    var edge = edges[j];
    var fromNode = createdNodes.get(edge.from);
    var toNode = createdNodes.get(edge.to);

    if (!fromNode || !toNode) continue;

    try {
      var fromPos = positions.get(edge.from);
      var toPos = positions.get(edge.to);
      var magnets = getMagnets(fromPos, toPos);

      var connector = figma.createConnector();
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
      var dy = (toPos ? toPos.y : 0) - (fromPos ? fromPos.y : 0);
      connector.connectorLineType = dy < -80 ? "CURVE" : "ELBOWED";
    } catch (e) {
      console.log("커넥터 생성 실패 [" + edge.from + " -> " + edge.to + "]:", e);
    }
  }

  // 뷰포트 이동
  var allCreated = Array.from(createdNodes.values());
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

  var dx = toPos.x - fromPos.x;
  var dy = toPos.y - fromPos.y;

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
  var positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  var g = new dagre.graphlib.Graph();
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
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var w = node.type === "decision" ? DECISION_W : NODE_W;
    var h = node.type === "decision" ? DECISION_H : NODE_H;
    g.setNode(node.id, { width: w, height: h });
  }

  // 엣지 추가 (중복 제거)
  var edgeSet: Record<string, boolean> = {};
  for (var j = 0; j < edges.length; j++) {
    var key = edges[j].from + "->" + edges[j].to;
    if (!edgeSet[key]) {
      edgeSet[key] = true;
      g.setEdge(edges[j].from, edges[j].to);
    }
  }

  // dagre 레이아웃 실행
  dagre.layout(g);

  // 결과 좌표 추출 (dagre는 중심 좌표 반환 → 좌상단으로 변환)
  g.nodes().forEach(function (nodeId: string) {
    var n = g.node(nodeId);
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

interface WireframeScreen {
  id: string;
  title: string;
  description: string;
  screenType?: string;
  step?: number;
  elements: { type: string; label: string; variant: string }[];
}

interface WireframeFlow {
  from: string;
  to: string;
  label: string;
  action: string;
}

interface WireframeData {
  screens: WireframeScreen[];
  flows: WireframeFlow[];
}

var SCREEN_WIDTHS: Record<string, number> = {
  mobile: 360,
  desktop: 800,
  modal: 480,
  toast: 320,
};
var SCREEN_PADDING = 24;
var ELEMENT_GAP = 12;
var STEP_X_GAP = 200;
var SAME_STEP_Y_GAP = 80;

var ELEMENT_STYLES: Record<string, { h: number; fill: { r: number; g: number; b: number }; radius: number }> = {
  header: { h: 48, fill: { r: 0.15, g: 0.15, b: 0.15 }, radius: 0 },
  nav: { h: 40, fill: { r: 0.93, g: 0.93, b: 0.96 }, radius: 8 },
  text: { h: 24, fill: { r: 1, g: 1, b: 1 }, radius: 0 },
  input: { h: 44, fill: { r: 0.97, g: 0.97, b: 0.97 }, radius: 8 },
  button: { h: 44, fill: { r: 0.2, g: 0.4, b: 1 }, radius: 10 },
  image: { h: 120, fill: { r: 0.92, g: 0.92, b: 0.95 }, radius: 8 },
  list: { h: 48, fill: { r: 0.98, g: 0.98, b: 0.99 }, radius: 6 },
  card: { h: 80, fill: { r: 0.96, g: 0.97, b: 1 }, radius: 12 },
  divider: { h: 1, fill: { r: 0.88, g: 0.88, b: 0.88 }, radius: 0 },
  icon: { h: 32, fill: { r: 1, g: 1, b: 1 }, radius: 0 },
};

async function createWireframe(data: WireframeData) {
  var screens = data.screens;
  var flows = data.flows;

  if (!screens || screens.length === 0) {
    figma.notify("화면 데이터가 없습니다.");
    return;
  }

  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
  ]);

  var isFigJam = figma.editorType === "figjam";

  // 화면별 너비/높이 계산
  var screenWidths: Record<string, number> = {};
  var screenHeights: Record<string, number> = {};

  for (var i = 0; i < screens.length; i++) {
    var s = screens[i];
    var sw = SCREEN_WIDTHS[s.screenType || "desktop"] || SCREEN_WIDTHS.desktop;
    screenWidths[s.id] = sw;

    var h = 72;
    for (var j = 0; j < s.elements.length; j++) {
      var style = ELEMENT_STYLES[s.elements[j].type] || ELEMENT_STYLES.text;
      h += style.h + ELEMENT_GAP;
    }
    h += SCREEN_PADDING * 2;
    screenHeights[s.id] = Math.max(h, 300);
  }

  // step 기반 좌→우 배치 (같은 step은 세로로 나열)
  var stepGroups: Record<number, WireframeScreen[]> = {};
  for (var si2 = 0; si2 < screens.length; si2++) {
    var step = screens[si2].step || 1;
    if (!stepGroups[step]) stepGroups[step] = [];
    stepGroups[step].push(screens[si2]);
  }

  var sortedSteps = Object.keys(stepGroups).map(Number).sort(function (a, b) { return a - b; });

  var screenPositions = new Map<string, { x: number; y: number }>();
  var createdFrames = new Map<string, SceneNode>();
  var curX = 0;

  for (var stepIdx = 0; stepIdx < sortedSteps.length; stepIdx++) {
    var stepNum = sortedSteps[stepIdx];
    var group = stepGroups[stepNum];

    // 이 step에서 가장 넓은 화면의 너비
    var maxW = 0;
    for (var gi = 0; gi < group.length; gi++) {
      var w = screenWidths[group[gi].id] || 360;
      if (w > maxW) maxW = w;
    }

    // 같은 step 내 화면들을 세로로 배치
    var curY = 0;
    for (var gj = 0; gj < group.length; gj++) {
      screenPositions.set(group[gj].id, { x: curX, y: curY });
      curY += screenHeights[group[gj].id] + SAME_STEP_Y_GAP;
    }

    curX += maxW + STEP_X_GAP;
  }

  // 각 화면 생성
  for (var si = 0; si < screens.length; si++) {
    var screen = screens[si];
    var pos = screenPositions.get(screen.id);
    if (!pos) continue;
    var screenH = screenHeights[screen.id];

    try {
      // Figma Frame으로 화면 생성
      var frame = figma.createFrame();
      frame.name = screen.title;
      var screenW = screenWidths[screen.id] || 360;
      frame.resize(screenW, screenH);
      frame.x = pos.x;
      frame.y = pos.y;
      frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      frame.cornerRadius = 16;
      frame.strokeWeight = 1;
      frame.strokes = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
      frame.clipsContent = true;

      // step 번호 + 화면 이름 라벨 (프레임 위에)
      var stepLabel = screen.step ? "Step " + screen.step + " · " : "";
      var typeLabel = screen.screenType ? " [" + screen.screenType + "]" : "";
      var titleLabel = figma.createText();
      titleLabel.characters = stepLabel + screen.title + typeLabel;
      titleLabel.fontSize = 13;
      titleLabel.fontName = { family: "Inter", style: "Bold" };
      titleLabel.fills = [{ type: "SOLID", color: { r: 0.35, g: 0.35, b: 0.45 } }];
      titleLabel.x = pos.x;
      titleLabel.y = pos.y - 24;

      // 상태바 영역
      var statusBar = figma.createRectangle();
      statusBar.resize(screenW, 44);
      statusBar.fills = [{ type: "SOLID", color: { r: 0.97, g: 0.97, b: 0.97 } }];
      frame.appendChild(statusBar);
      statusBar.x = 0;
      statusBar.y = 0;

      // 상태바 제목
      var statusText = figma.createText();
      statusText.characters = screen.title;
      statusText.fontSize = 13;
      statusText.fontName = { family: "Inter", style: "Medium" };
      statusText.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
      frame.appendChild(statusText);
      statusText.x = SCREEN_PADDING;
      statusText.y = 12;

      var curY = 44 + SCREEN_PADDING;

      // UI 요소 생성
      for (var ei = 0; ei < screen.elements.length; ei++) {
        var elem = screen.elements[ei];
        var elemStyle = ELEMENT_STYLES[elem.type] || ELEMENT_STYLES.text;
        var elemW = screenW - SCREEN_PADDING * 2;

        if (elem.type === "divider") {
          var divLine = figma.createRectangle();
          divLine.resize(elemW, 1);
          divLine.fills = [{ type: "SOLID", color: elemStyle.fill }];
          frame.appendChild(divLine);
          divLine.x = SCREEN_PADDING;
          divLine.y = curY;
          curY += ELEMENT_GAP;
          continue;
        }

        if (elem.type === "header") {
          var headerBg = figma.createRectangle();
          headerBg.resize(screenW, elemStyle.h);
          headerBg.fills = [{ type: "SOLID", color: elemStyle.fill }];
          frame.appendChild(headerBg);
          headerBg.x = 0;
          headerBg.y = curY;

          var headerText = figma.createText();
          headerText.characters = elem.label;
          headerText.fontSize = 14;
          headerText.fontName = { family: "Inter", style: "Bold" };
          headerText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
          frame.appendChild(headerText);
          headerText.x = SCREEN_PADDING;
          headerText.y = curY + 14;

          curY += elemStyle.h + ELEMENT_GAP;
          continue;
        }

        if (elem.type === "button") {
          var isOutline = elem.variant === "outline" || elem.variant === "ghost";
          var btnBg = figma.createRectangle();
          btnBg.resize(elemW, elemStyle.h);
          btnBg.cornerRadius = elemStyle.radius;
          if (isOutline) {
            btnBg.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            btnBg.strokeWeight = 1.5;
            btnBg.strokes = [{ type: "SOLID", color: { r: 0.2, g: 0.4, b: 1 } }];
          } else if (elem.variant === "secondary") {
            btnBg.fills = [{ type: "SOLID", color: { r: 0.93, g: 0.93, b: 0.96 } }];
          } else {
            btnBg.fills = [{ type: "SOLID", color: elemStyle.fill }];
          }
          frame.appendChild(btnBg);
          btnBg.x = SCREEN_PADDING;
          btnBg.y = curY;

          var btnText = figma.createText();
          btnText.characters = elem.label;
          btnText.fontSize = 13;
          btnText.fontName = { family: "Inter", style: "Medium" };
          if (isOutline) {
            btnText.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.4, b: 1 } }];
          } else if (elem.variant === "secondary") {
            btnText.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
          } else {
            btnText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
          }
          frame.appendChild(btnText);
          btnText.x = SCREEN_PADDING + 16;
          btnText.y = curY + 13;

          curY += elemStyle.h + ELEMENT_GAP;
          continue;
        }

        if (elem.type === "input") {
          var inputBg = figma.createRectangle();
          inputBg.resize(elemW, elemStyle.h);
          inputBg.cornerRadius = elemStyle.radius;
          inputBg.fills = [{ type: "SOLID", color: elemStyle.fill }];
          inputBg.strokeWeight = 1;
          inputBg.strokes = [{ type: "SOLID", color: { r: 0.82, g: 0.82, b: 0.82 } }];
          frame.appendChild(inputBg);
          inputBg.x = SCREEN_PADDING;
          inputBg.y = curY;

          var inputText = figma.createText();
          inputText.characters = elem.label;
          inputText.fontSize = 12;
          inputText.fontName = { family: "Inter", style: "Regular" };
          inputText.fills = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.6 } }];
          frame.appendChild(inputText);
          inputText.x = SCREEN_PADDING + 12;
          inputText.y = curY + 14;

          curY += elemStyle.h + ELEMENT_GAP;
          continue;
        }

        if (elem.type === "image") {
          var imgBg = figma.createRectangle();
          imgBg.resize(elemW, elemStyle.h);
          imgBg.cornerRadius = elemStyle.radius;
          imgBg.fills = [{ type: "SOLID", color: elemStyle.fill }];
          frame.appendChild(imgBg);
          imgBg.x = SCREEN_PADDING;
          imgBg.y = curY;

          var imgLabel = figma.createText();
          imgLabel.characters = elem.label || "이미지";
          imgLabel.fontSize = 11;
          imgLabel.fontName = { family: "Inter", style: "Regular" };
          imgLabel.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.55 } }];
          frame.appendChild(imgLabel);
          imgLabel.x = SCREEN_PADDING + 12;
          imgLabel.y = curY + elemStyle.h / 2 - 6;

          curY += elemStyle.h + ELEMENT_GAP;
          continue;
        }

        // 기본: text, list, card, nav, icon 등
        if (elem.type === "card" || elem.type === "list" || elem.type === "nav") {
          var cardBg = figma.createRectangle();
          cardBg.resize(elemW, elemStyle.h);
          cardBg.cornerRadius = elemStyle.radius;
          cardBg.fills = [{ type: "SOLID", color: elemStyle.fill }];
          cardBg.strokeWeight = 1;
          cardBg.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.92 } }];
          frame.appendChild(cardBg);
          cardBg.x = SCREEN_PADDING;
          cardBg.y = curY;
        }

        var textNode = figma.createText();
        textNode.characters = elem.label;
        textNode.fontSize = elem.type === "text" || elem.type === "icon" ? 12 : 11;
        textNode.fontName = { family: "Inter", style: elem.type === "nav" ? "Medium" : "Regular" };
        textNode.fills = [{ type: "SOLID", color: { r: 0.25, g: 0.25, b: 0.25 } }];
        frame.appendChild(textNode);
        textNode.x = SCREEN_PADDING + (elem.type === "text" || elem.type === "icon" ? 0 : 12);
        textNode.y = curY + (elem.type === "text" || elem.type === "icon" ? 4 : Math.floor(elemStyle.h / 2) - 6);

        curY += elemStyle.h + ELEMENT_GAP;
      }

      createdFrames.set(screen.id, frame);
    } catch (e) {
      console.log("화면 생성 실패 [" + screen.id + "]:", e);
    }
  }

  // 흐름 화살표 생성
  for (var fj = 0; fj < flows.length; fj++) {
    var flow = flows[fj];
    var fromFrame = createdFrames.get(flow.from);
    var toFrame = createdFrames.get(flow.to);
    if (!fromFrame || !toFrame) continue;

    try {
      if (isFigJam) {
        // FigJam에서는 커넥터 사용
        var connector = figma.createConnector();
        connector.connectorStart = { endpointNodeId: fromFrame.id, magnet: "RIGHT" as ConnectorMagnet };
        connector.connectorEnd = { endpointNodeId: toFrame.id, magnet: "LEFT" as ConnectorMagnet };
        connector.connectorLineType = "CURVE";
        if (flow.label) connector.text.characters = flow.label;
      } else {
        // Figma에서는 화살표 선 + 라벨 텍스트
        var fromPos2 = screenPositions.get(flow.from);
        var toPos2 = screenPositions.get(flow.to);
        if (!fromPos2 || !toPos2) continue;

        var fromScreenW = screenWidths[flow.from] || 360;
        var fromX = fromPos2.x + fromScreenW;
        var fromY = fromPos2.y + (screenHeights[flow.from] || 300) / 2;
        var toX = toPos2.x;
        var toY = toPos2.y + (screenHeights[flow.to] || 300) / 2;

        // 화살표 선
        var line = figma.createLine();
        var dx = toX - fromX;
        var dy = toY - fromY;
        var len = Math.sqrt(dx * dx + dy * dy);
        line.resize(len, 0);
        line.x = fromX;
        line.y = fromY;
        line.rotation = -Math.atan2(dy, dx) * (180 / Math.PI);
        line.strokes = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.7 } }];
        line.strokeWeight = 1.5;

        // 흐름 라벨
        if (flow.label) {
          var flowLabel = figma.createText();
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

  var allFrames = Array.from(createdFrames.values());
  if (allFrames.length > 0) {
    figma.viewport.scrollAndZoomIntoView(allFrames);
  }

  figma.notify("와이어프레임 생성 완료 (" + screens.length + "개 화면, " + flows.length + "개 흐름)");
}
