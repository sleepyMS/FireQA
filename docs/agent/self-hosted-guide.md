# FireQA Agent Self-Hosted 가이드

로컬 머신 또는 자체 서버에서 FireQA Agent를 설치하고 실행하는 방법.

---

## 요구 사항

| 항목 | 최소 버전 | 비고 |
|------|-----------|------|
| Node.js | 18+ | `node --version`으로 확인 |
| Claude Code | 최신 | `claude --version`으로 확인. [설치 가이드](https://docs.anthropic.com/claude-code) |
| Anthropic API Key | - | Claude Code 실행에 필요. 환경 변수 `ANTHROPIC_API_KEY` 설정 |
| FireQA 계정 | - | https://fireqa.vercel.app 에서 가입 |

### 선택 사항

| 항목 | 비고 |
|------|------|
| Figma MCP | 다이어그램/와이어프레임 Figma 연동 시 필요. `claude mcp list`로 설정 확인 |

---

## 설치 및 인증

### 방법 1: OAuth Device Flow (권장)

브라우저를 통해 FireQA 계정으로 인증한다. SSH 세션이나 원격 서버에서도 동작한다.

```bash
npx fireqa-agent login
```

실행하면 터미널에 URL이 표시된다:

```
다음 단계를 따라 에이전트를 연결하세요:

1. 아래 URL을 브라우저에서 여세요:
   https://fireqa.vercel.app/auth/device?code=<deviceCode>&source=agent

2. FireQA 계정으로 로그인 후 에이전트 연결을 승인하세요.

승인을 기다리는 중... (최대 5분)
```

브라우저에서 승인하면 토큰이 자동으로 `~/.fireqa/config.json`에 저장된다.

### 방법 2: API Key

웹 대시보드에서 발급받은 API Key를 직접 입력한다.

```bash
npx fireqa-agent login --api-key
```

```
API Key를 입력하세요 (fqa_...): fqa_a1b2c3d4...
인증 성공! 에이전트 "user@hostname" 등록됨.
```

API Key는 웹 대시보드의 **설정 > API Keys** 페이지에서 발급받을 수 있다. `fqa_` 접두사로 시작하는 키만 유효하다.

---

## 에이전트 실행

```bash
npx fireqa-agent start
```

실행하면 에이전트가 FireQA 서버를 폴링하며 작업을 대기한다. 작업이 할당되면 자동으로 Claude Code를 스폰하여 실행한다.

### 시작 시 검증 순서

1. `config.cli` (기본: `claude`) 바이너리가 PATH에 존재하는지 확인
2. 미설치 시 설치 가이드 출력 후 중단
3. Figma MCP 설정 여부 확인 (`claude mcp list` 파싱)
4. Figma MCP 미설정 시 경고 출력 (중단하지 않음)

---

## 설정

설정 파일 경로: `~/.fireqa/config.json`

### 기본 설정값

```json
{
  "server": "https://fireqa.vercel.app",
  "cli": "claude",
  "pollingIntervalMs": 3000,
  "maxConcurrentTasks": 1
}
```

### 설정 필드

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `server` | string | `"https://fireqa.vercel.app"` | FireQA 서버 URL |
| `auth` | object | - | 인증 정보. `login` 명령으로 자동 설정됨 |
| `auth.token` | string | - | API Key 또는 OAuth 토큰 |
| `cli` | string | `"claude"` | 스폰할 CLI 바이너리 이름 |
| `pollingIntervalMs` | number | `3000` | 작업 큐 폴링 간격 (밀리초) |
| `maxConcurrentTasks` | number | `1` | 동시 실행 가능한 최대 작업 수 |

### 설정 파일 예시

```json
{
  "server": "https://fireqa.vercel.app",
  "auth": {
    "token": "fqa_a1b2c3d4e5f6..."
  },
  "cli": "claude",
  "pollingIntervalMs": 3000,
  "maxConcurrentTasks": 1
}
```

---

## CLI 명령어

### login

FireQA에 인증한다.

```bash
# OAuth Device Flow (브라우저 인증)
npx fireqa-agent login

# API Key 직접 입력
npx fireqa-agent login --api-key
```

### start

에이전트를 시작한다. FireQA 작업 큐를 폴링하고 CLI를 실행한다.

```bash
npx fireqa-agent start
```

### config

현재 설정을 표시한다. 토큰은 앞 12자만 표시된다.

```bash
npx fireqa-agent config
```

출력 예시:

```json
{
  "server": "https://fireqa.vercel.app",
  "auth": {
    "token": "fqa_a1b2c3d4..."
  },
  "cli": "claude",
  "pollingIntervalMs": 3000,
  "maxConcurrentTasks": 1
}
```

### config:set

개별 설정값을 변경한다.

```bash
npx fireqa-agent config:set <key> <value>
```

변경 가능한 키:

| 키 | 설명 | 예시 |
|----|------|------|
| `cli` | CLI 바이너리 이름 | `npx fireqa-agent config:set cli claude` |
| `server` | FireQA 서버 URL | `npx fireqa-agent config:set server https://my-fireqa.com` |
| `pollingIntervalMs` | 폴링 간격 (밀리초) | `npx fireqa-agent config:set pollingIntervalMs 5000` |
| `maxConcurrentTasks` | 최대 동시 작업 수 | `npx fireqa-agent config:set maxConcurrentTasks 2` |

`pollingIntervalMs`와 `maxConcurrentTasks`는 자동으로 정수로 변환된다.

---

## 트러블슈팅

### "인증이 필요합니다" (401)

**원인**: 토큰이 없거나 만료되었다.

**해결**:
```bash
npx fireqa-agent login
```
또는 API Key를 재발급받아 다시 로그인한다.

### "에이전트 버전이 너무 낮습니다" (426)

**원인**: 설치된 에이전트 버전이 서버 최소 요구 버전(0.1.0) 미만이다.

**해결**:
```bash
npm update -g fireqa-agent
```

### "claude: command not found"

**원인**: Claude Code가 설치되지 않았거나 PATH에 없다.

**해결**:
1. Claude Code 설치: https://docs.anthropic.com/claude-code
2. 설치 확인: `claude --version`
3. PATH에 없는 경우 절대 경로 설정: `npx fireqa-agent config:set cli /usr/local/bin/claude`

### Figma MCP 관련 경고

**원인**: Figma MCP 서버가 Claude Code에 설정되어 있지 않다.

**영향**: 다이어그램/와이어프레임 생성 시 Figma 연동이 불가하다. TC 생성은 영향 없음.

**해결**: Claude Code에 Figma MCP 서버를 추가한다.
```bash
claude mcp add figma
```

### 작업이 수령되지 않음

**확인 사항**:
1. 에이전트가 `start` 상태인지 확인
2. 웹 대시보드에서 에이전트 상태가 "online"인지 확인
3. 대기 중인 작업이 있는지 확인
4. 네트워크 연결 확인 (에이전트가 `server` URL에 접근 가능한지)

### 네트워크 끊김 / 재연결

에이전트는 네트워크 끊김 시 exponential backoff로 자동 재연결을 시도한다 (1초 -> 2초 -> 4초 -> ... -> 최대 30초). 별도 조치가 필요하지 않다.

### 결과 전송 실패

에이전트는 결과 전송 실패 시 로컬에 임시 저장하고 재연결 시 자동으로 재전송한다.

### 작업 타임아웃

기본 타임아웃은 5분(300000ms)이다. 타임아웃 시 CLI 프로세스에 SIGTERM을 전송하고, 5초 후에도 종료되지 않으면 SIGKILL을 전송한다.
