# FireQA Agent 프롬프트 템플릿

에이전트 작업의 프롬프트는 6개 레이어를 순서대로 조합하여 생성된다. 각 레이어는 `\n\n---\n\n`(줄바꿈 + 수평선 + 줄바꿈)으로 구분된다.

소스 코드: `src/lib/agent/prompt-builder.ts`

---

## 프롬프트 레이어 구조

```
최종 프롬프트 = Layer 1 + Layer 2 + Layer 3 + Layer 4 + Layer 5 + Layer 6
```

### Layer 1: 시스템 역할

작업 유형(`type`)에 따른 시스템 프롬프트. AI의 역할과 행동 규칙을 정의한다. `custom` 타입은 시스템 역할이 없다 (빈 문자열).

### Layer 2: 프로젝트 컨텍스트

프로젝트 이름과 설명. 작업이 프로젝트에 연결된 경우에만 포함된다.

```
프로젝트: FireQA
설명: QA 자동화 플랫폼
```

### Layer 3: 템플릿

`context.templateContent`가 있을 때 포함된다. TC 생성 시 출력 형식을 지정하는 데 사용된다.

```
다음 템플릿 형식을 따라라:
{templateContent}
```

### Layer 4: 첨부 파일

`context.uploadUrls`가 있을 때 포함된다. 분석 대상 기획서의 URL 목록.

```
분석할 기획서:
https://fireqa.../uploads/spec1.pdf
https://fireqa.../uploads/spec2.pdf
```

### Layer 5: Figma 지시

`context.figmaFileKey`가 있을 때 포함된다. 다이어그램이나 와이어프레임을 Figma에 직접 추가하도록 지시한다.

```
Figma 파일 키: abc123
다이어그램이나 와이어프레임을 생성한 후 Figma MCP를 사용하여 이 파일에 추가하라.
```

### Layer 6: 사용자 지시

사용자가 직접 입력한 프롬프트. 항상 마지막에 포함된다.

---

## 작업 유형별 시스템 프롬프트

### tc-generate (TC 생성)

```
너는 숙련된 QA 엔지니어다. 기획서를 분석하여 빠짐없이 테스트 케이스를 작성한다.
- 긍정/부정/경계값/예외 시나리오를 모두 포함한다
- 각 TC에 전제조건, 테스트 단계, 기대결과를 명확히 기술한다
- 결과를 JSON 형식으로 반환한다
```

역할: QA 엔지니어
핵심 지시: 기획서 분석 -> TC 생성, 템플릿 준수, JSON 출력

### diagram-generate (다이어그램 생성)

```
너는 다이어그램 설계자다. 기획서를 분석하여 사용자 플로우 다이어그램을 생성한다.
- 주요 화면과 사용자 행동 흐름을 노드와 엣지로 표현한다
- 분기 조건, 에러 플로우를 포함한다
```

역할: 다이어그램 설계자
핵심 지시: 기획서 -> 사용자 플로우, Figma MCP로 생성

### wireframe-generate (와이어프레임 생성)

```
너는 UI 설계자다. 기획서를 분석하여 화면 와이어프레임을 생성한다.
- 화면별 주요 UI 요소의 배치와 계층 구조를 표현한다
- 인터랙션 포인트를 명시한다
```

역할: UI 설계자
핵심 지시: 기획서 -> 화면 와이어프레임, Figma MCP로 생성

### improve-spec (기획서 개선)

```
너는 QA 리뷰어다. 기존 테스트 케이스를 분석하여 개선한다.
- 누락된 시나리오를 추가한다
- 기존 TC의 모호한 부분을 구체화한다
```

역할: QA 리뷰어
핵심 지시: 기존 TC 개선, 누락 케이스 보완

### custom (커스텀)

시스템 역할 없음 (빈 문자열). 사용자 프롬프트가 그대로 전달된다.

---

## 프롬프트 빌더 함수

```typescript
type PromptInput = {
  type: string;          // 작업 유형
  prompt: string;        // 사용자 지시 (Layer 6)
  context: AgentTaskContext;
  project?: { name: string; description?: string | null };
};

type AgentTaskContext = {
  uploadUrls?: string[];
  templateContent?: string;
  figmaFileKey?: string;
  [key: string]: unknown;
};

function buildAgentPrompt(input: PromptInput): string
```

### 조합 예시

**tc-generate + 프로젝트 + 템플릿 + 첨부 파일** 입력:

```typescript
buildAgentPrompt({
  type: "tc-generate",
  prompt: "로그인 기능에 대한 TC를 작성해줘",
  context: {
    uploadUrls: ["https://fireqa.../uploads/login-spec.pdf"],
    templateContent: "ID | 제목 | 전제조건 | 단계 | 기대결과",
  },
  project: { name: "FireQA", description: "QA 자동화 플랫폼" },
});
```

생성되는 프롬프트:

```
너는 숙련된 QA 엔지니어다. 기획서를 분석하여 빠짐없이 테스트 케이스를 작성한다.
- 긍정/부정/경계값/예외 시나리오를 모두 포함한다
- 각 TC에 전제조건, 테스트 단계, 기대결과를 명확히 기술한다
- 결과를 JSON 형식으로 반환한다

---

프로젝트: FireQA
설명: QA 자동화 플랫폼

---

다음 템플릿 형식을 따라라:
ID | 제목 | 전제조건 | 단계 | 기대결과

---

분석할 기획서:
https://fireqa.../uploads/login-spec.pdf

---

로그인 기능에 대한 TC를 작성해줘
```

**diagram-generate + Figma** 입력:

```typescript
buildAgentPrompt({
  type: "diagram-generate",
  prompt: "회원가입 플로우 다이어그램을 만들어줘",
  context: {
    uploadUrls: ["https://fireqa.../uploads/signup-spec.pdf"],
    figmaFileKey: "abc123",
  },
  project: { name: "FireQA" },
});
```

생성되는 프롬프트:

```
너는 다이어그램 설계자다. 기획서를 분석하여 사용자 플로우 다이어그램을 생성한다.
- 주요 화면과 사용자 행동 흐름을 노드와 엣지로 표현한다
- 분기 조건, 에러 플로우를 포함한다

---

프로젝트: FireQA

---

분석할 기획서:
https://fireqa.../uploads/signup-spec.pdf

---

Figma 파일 키: abc123
다이어그램이나 와이어프레임을 생성한 후 Figma MCP를 사용하여 이 파일에 추가하라.

---

회원가입 플로우 다이어그램을 만들어줘
```

---

## 레이어 포함 조건 요약

| 레이어 | 포함 조건 |
|--------|-----------|
| Layer 1: 시스템 역할 | `type`이 `custom`이 아닌 경우 (`custom`은 빈 문자열이므로 falsy) |
| Layer 2: 프로젝트 컨텍스트 | `project`가 존재하는 경우 |
| Layer 3: 템플릿 | `context.templateContent`가 존재하는 경우 |
| Layer 4: 첨부 파일 | `context.uploadUrls`가 존재하고 길이가 1 이상인 경우 |
| Layer 5: Figma 지시 | `context.figmaFileKey`가 존재하는 경우 |
| Layer 6: 사용자 지시 | 항상 포함 |
