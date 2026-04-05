# FireQA UX/UI 개선점 분석 리포트

## 목차
1. [온보딩 흐름](#1-온보딩-흐름)
2. [네비게이션 및 정보 구조](#2-네비게이션-및-정보-구조)
3. [생성 결과 UX](#3-생성-결과-ux)
4. [반응형 디자인](#4-반응형-디자인)
5. [에러 처리 UX](#5-에러-처리-ux)
6. [접근성(a11y)](#6-접근성a11y)
7. [빈 상태(Empty State)](#7-빈-상태empty-state)
8. [로딩 상태](#8-로딩-상태)
9. [폼 검증 및 피드백](#9-폼-검증-및-피드백)
10. [알림/토스트](#10-알림토스트)
11. [다크모드](#11-다크모드)
12. [협업 UX](#12-협업-ux)

---

## 1. 온보딩 흐름

### 현재 상태
- `/onboarding` 페이지에서 사용자가 팀 이름과 팀 URL 슬러그를 설정
- 초대 코드로 기존 팀 참여 옵션 제공
- 실시간 슬러그 유효성 검사 및 피드백 (🔴 `text-destructive`, 🟢 `text-emerald-600`)
- 한글/영문 자동 슬러그 생성 또는 수동 입력 가능
- Suspense 폴백으로 로딩 상태 표시

**코드 근거**: `src/app/(auth)/onboarding/page.tsx` (line 32-227)
- 멤버십 확인 후 기존 팀이 있으면 리다이렉트
- Supabase auth 상태 확인
- 폼 입력값에 대한 실시간 검증

### 문제점
1. **튜토리얼/가이드 부족**: 팀 생성 후 바로 대시보드로 진입되어 무엇을 할 수 있는지 설명이 없음
   - 가이드 페이지가 따로 있지만 온보딩 완료 후 자동으로 안내하지 않음

2. **초대 코드 입력 UX 불명확**: 
   - 초대 코드 또는 초대 링크라는 설명이 있지만 예시가 없음
   - 토큰 추출 로직(`extractToken`)이 숨겨져 있음 (사용자는 인식 못함)

3. **슬러그 입력에 대한 예시 부족**:
   - 한글 이름일 때 "직접 입력해주세요"라는 메시지만 있음
   - 좋은 슬러그 예시가 없음

4. **사용자 이름 선택지 부족**:
   - 이름은 선택사항이지만 중요성이 명확하지 않음
   - Supabase에서 가져온 이름이 없을 때 폴백 처리는 좋지만 설명이 없음

5. **진행률 표시 없음**:
   - 첫 사용자 입장에서는 "거의 다 됐어요!"라는 텍스트만으로는 전체 온보딩이 한 단계인지 여러 단계인지 불명확

6. **오류 메시지 우선순위**:
   - 슬러그 유효성 오류가 빨간색(destructive)로 표시되지만 경고(amber)가 더 적절할 수 있음

### 개선 제안

#### 개선안 1: 온보딩 가이드 추가 (높음 우선순위)
```
- 팀 생성 완료 후 자동으로 인터랙티브 온보딩 가이드 표시
  - 1단계: 프로젝트 생성
  - 2단계: 기획 문서 업로드
  - 3단계: TC 생성 실행
  - 각 단계별로 "건너뛰기" 옵션 제공
```

#### 개선안 2: 초대 코드 입력 UX 개선 (중간 우선순위)
```
- 플레이스홀더 개선: "초대 링크 또는 토큰을 붙여넣으세요"로 변경
- 예시 추가: "예시: https://fireqa.com/invite?token=abc123"
- QR 코드 스캔 옵션 추가 (팀 설정에서 QR 코드 생성 후)
```

#### 개선안 3: 슬러그 입력 가이드 (낮음 우선순위)
```
- "좋은 예시: my-team, qa-team, product-qa"로 변경
- 슬러그 자동 생성 시 그 결과를 프리뷰로 보여주기
- "fireqa.com/{slug}" 미리보기가 있지만 슬러그 입력 필드 placeholder에도 예시 추가
```

#### 개선안 4: 온보딩 진행률 표시 (낮음 우선순위)
```
- "Step 1 of 1: 팀 설정" 같은 형태의 진행률 표시
- 또는 프로그레시브 온보딩으로 변경 (팀 생성 후 프로필 설정 → 프로젝트 생성 유도)
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| 온보딩 가이드 추가 | **높음** | 첫 사용자 경험이 매우 중요하며 현재 가이드 페이지가 따로 있음 |
| 초대 코드 UX 개선 | 중간 | 팀 초대 시 혼란 가능성 |
| 슬러그 입력 가이드 | 낮음 | 이미 실시간 검증과 피드백이 있음 |
| 온보딩 진행률 표시 | 낮음 | 현재 단일 단계이므로 실제 필요성 낮음 |

---

## 2. 네비게이션 및 정보 구조

### 현재 상태
- **사이드바**: 왼쪽 고정 사이드바 (`lg:pl-60` breakpoint에서 고정 너비 240px)
  - 조직 전환 (OrgSwitcher)
  - 주 네비게이션: 대시보드, 프로젝트, 템플릿, 가이드, 에이전트, 설정
  - 프로젝트 선택 시 프로젝트 관련 서브 메뉴 (9개 항목)

- **헤더**: 상단 고정 헤더 (`sticky top-0 z-20`)
  - 현재 페이지 제목 표시
  - 검색 다이얼로그 (Cmd+K / Ctrl+K)
  - 알림 벨
  
**코드 근거**: `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`

### 문제점

1. **깊은 중첩 네비게이션**:
   - 주 메뉴 6개 + 프로젝트 서브 메뉴 9개 = 최대 15개 네비게이션 아이템
   - 프로젝트 선택 후 TC 생성 → TC 생성 결과 → 댓글 작성 같은 4-5 depth 흐름 발생
   - 브래드크럼이 있지만 "뒤로 가기" 버튼이 없음 (사이드바에서는 프로젝트 컨텍스트 전환이 필요)

2. **모바일에서 사이드바 공간 낭비**:
   - `lg:pl-60`은 1024px 이상에서만 고정 사이드바 표시
   - 작은 화면에서도 숨겨진 사이드바로 인해 헤더가 pl-14 (모바일)에서 px-6 (데스크톱)로 변함
   - 토글 메뉴 아이콘이 헤더에 없음 (사이드바 구현에서 모바일 처리 상태 불명확)

3. **검색 다이얼로그 접근성 낮음**:
   - 검색 버튼이 `hidden sm:flex`이므로 모바일에서는 숨겨짐
   - Cmd+K 단축키도 모바일에서는 도움이 되지 않음
   - 검색 결과가 프로젝트, 작업, 댓글 3가지만 있음 (설정, 페이지는 검색 불가)

4. **프로젝트 서브 메뉴의 조건부 활성화 로직이 복잡**:
   - `isProjectNavActive` 함수가 각 항목별로 href를 직접 비교함
   - URL 구조가 복잡하면 오류 가능성 높음 (예: `/generate`, `/diagrams` 등이 모두 다른 경로)

5. **조직 전환 후 네비게이션 리셋**:
   - 사이드바에서 조직을 전환하면 프로젝트 선택이 리셋됨 (당연하지만 사용자 관점에서 혼란 가능)
   - 각 조직별로 마지막 방문 프로젝트를 기억해야 함

6. **현재 페이지 강조 표시 부족**:
   - 주 메뉴는 active 스타일이 적용되지만 프로젝트 서브 메뉴의 active 상태가 불명확함
   - TC 생성 결과 페이지에서 어느 메뉴가 선택되었는지 명확하지 않음

### 개선 제안

#### 개선안 1: 모바일 네비게이션 재설계 (높음 우선순위)
```
- 화면 크기별 네비게이션 전략:
  - 모바일 (< 768px): 하단 탭 네비게이션 추가
    * 대시보드, 프로젝트, 검색, 알림, 프로필 5개 탭
    * 슬라이드 아웃 모달로 조직 전환
  - 태블릿 (768px - 1024px): 축소된 사이드바 (아이콘만)
  - 데스크톱 (> 1024px): 현재대로 유지

- 검색 모바일 최적화:
  * 모든 화면 크기에서 검색 접근 가능 (하단 탭 또는 헤더 아이콘)
  * 검색 결과를 스크롤 가능한 리스트로 개선
```

#### 개선안 2: 프로젝트 이동 경험 개선 (중간 우선순위)
```
- 각 조직별로 마지막 방문 프로젝트 저장 (localStorage 또는 DB)
  * 조직 전환 → 마지막 프로젝트로 자동 진입
- 작업 결과 페이지에 "이전 작업으로", "다음 작업으로" 네비게이션 추가
  * 여러 TC 결과를 빠르게 비교할 때 도움
```

#### 개선안 3: 네비게이션 단순화 (중간 우선순위)
```
- 주 메뉴에서 "템플릿" 제거 (자주 사용하지 않을 가능성 높음)
- "가이드" → 대시보드의 인라인 가이드 또는 도움말 아이콘으로 변경
- 프로젝트 서브 메뉴 단축:
  * 항상 표시하는 것 (개요, TC 자동 생성, 다이어그램, 와이어프레임, 기획서 개선)
  * 접고 펼 수 있는 것 (생성 이력, 활동 로그, 분석, 파일)
```

#### 개선안 4: 네비게이션 진행 상태 명확화 (낮음 우선순위)
```
- 현재 활성 메뉴 항목의 배경색 더 강조 (현재: hover와 active 구분 어려움)
- 프로젝트 서브 메뉴에도 명확한 active 스타일 적용
  * 예: 밑줄 + 텍스트 볼드 또는 배경색 강조
```

#### 개선안 5: Breadcrumb 개선 (낮음 우선순위)
```
- "뒤로 가기" 버튼을 breadcrumb 이전에 추가
- Breadcrumb의 모든 항목이 클릭 가능하도록 구현 (현재는 마지막 항목만 비활성)
- 모바일에서 breadcrumb 축약 표시 (예: "프로젝트 > TC 생성 결과" → "...> TC 생성 결과")
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| 모바일 네비게이션 재설계 | **높음** | 모바일 사용성이 크게 떨어짐 |
| 프로젝트 이동 경험 개선 | 중간 | 같은 조직 내 여러 프로젝트를 다룰 때 필요 |
| 네비게이션 단순화 | 중간 | 메뉴 항목이 너무 많음 (15개) |
| 네비게이션 진행 상태 명확화 | 중간 | 현재 위치 파악이 어려움 |
| Breadcrumb 개선 | 낮음 | 기존 breadcrumb이 이미 있음 |

---

## 3. 생성 결과 UX

### 현재 상태
- SSE(Server-Sent Events) + 폴링 조합 처리
  - PROCESSING 상태: 5초마다 `router.refresh()` 호출
  - 응답 결과: 테스트케이스, 다이어그램, 와이어프레임별 결과 표시

- **로딩 UI**: `JobStatusDisplay` 컴포넌트
  - 로딩 중: 회전하는 스피너 + "생성하고 있습니다..." 메시지
  - 완료: 결과 표시
  - 실패: 에러 배너 (border-red-200, bg-red-50)

- **SSE 스트리밍** (다이어그램 개선/고정):
  - `useSSEInline` 커스텀 훅으로 실시간 진행 상황 표시
  - 초기 요청 → 스트리밍 응답 처리

**코드 근거**: 
- `src/app/(dashboard)/[orgSlug]/generate/[jobId]/page.tsx`
- `src/app/(dashboard)/[orgSlug]/diagrams/[jobId]/page.tsx`
- `src/components/job-status-display.tsx` (line 20-56)

### 문제점

1. **로딩 진행률 불명확**:
   - 5초 폴링은 느린 인터넷에서 체감이 나쁨 (최대 5초 대기)
   - SSE 스트리밍이 다이어그램 개선/고정에만 있고 초기 생성에는 없음
   - 진행률 표시가 없어서 얼마나 남았는지 알 수 없음

2. **에러 메시지 불친절**:
   - `{error && <p className="mt-2 text-sm">{error}</p>}`로 단순히 에러 텍스트만 표시
   - 에러 원인에 대한 설명이나 재시도 버튼이 없음
   - 어디로 연락해야 하는지 정보 부족

3. **생성 취소 기능 부재**:
   - PROCESSING 상태에서 생성을 취소할 방법이 없음
   - 사용자가 잘못된 파일을 업로드했을 때 대기만 해야 함

4. **결과 피드백 불명확**:
   - 생성 완료 후 토스트 알림이 없음 (페이지가 자동 갱신되지만 사용자가 알기 어려움)
   - 특히 백그라운드에서 페이지를 열어두었다가 돌아올 때 완료 여부 파악 어려움

5. **다이어그램/와이어프레임 결과 내보내기 위치**:
   - 결과 상단에 내보내기 버튼이 있지만 모바일에서는 버튼이 겹칠 수 있음
   - "Figma에 와이어프레임 생성하기" 안내 배지가 너무 작음 (12px)

6. **테스트케이스 표 모바일 렌더링**:
   - `min-w-[1100px]` 테이블이 모바일에서 가로 스크롤 필요
   - 스크롤 가능한 상태임을 사용자에게 알리지 않음

7. **결과 없음 상태 처리 부족**:
   - JSON 파싱 실패 시 결과를 표시하지 않지만 "결과가 없습니다" 같은 메시지 없음

### 개선 제안

#### 개선안 1: SSE 스트리밍 초기 생성에 확대 (높음 우선순위)
```
- TC 생성, 다이어그램 생성, 와이어프레임 생성 시 SSE 스트리밍 도입
- 진행률 표시: "단계 1/3: 파일 분석 중..." → "단계 2/3: TC 생성 중..." → "단계 3/3: 최종화 중..."
- 실시간 진행 상황을 프로그레스 바로 시각화
- 폴링 주기를 5초에서 1-2초로 단축 (SSE 사용 시)
```

#### 개선안 2: 에러 처리 개선 (높음 우선순위)
```
- 에러 메시지 템플릿 추가:
  * "알 수 없는 오류": 기술 지원팀에 문의하기 링크
  * "파일 형식 오류": 지원하는 형식 목록 + 예시
  * "API 할당량 초과": 사용량 확인 링크 + 업그레이드 안내
- 재시도 버튼 추가
- Slack/이메일로 오류 자동 보고 옵션
```

#### 개선안 3: 생성 취소 기능 (중간 우선순위)
```
- PROCESSING 상태에서 "생성 취소" 버튼 표시
- 취소 확인 다이얼로그: "생성 중인 작업을 취소하시겠습니까? 진행 상황이 사라집니다."
- 백엔드에서 진행 중인 작업 중단 처리
```

#### 개선안 4: 생성 완료 알림 (중간 우선순위)
```
- 생성 완료 시 토스트 알림: "TC 생성이 완료되었습니다"
- 탭이 활성화되지 않은 경우 브라우저 알림 (권한 필요)
  * "FireQA: TC 생성이 완료되었습니다. 클릭하여 확인하세요."
- 결과 페이지에 "완료된 시각" 표시
```

#### 개선안 5: 테이블 모바일 최적화 (중간 우선순위)
```
- 모바일에서 카드 레이아웃으로 전환:
  * 각 TC를 카드로 표시 (접을 수 있음)
  * 필수 정보만 표시: TC ID, TC명, 결과
  * "자세히 보기" 클릭 시 모달에서 전체 정보 표시
- 또는 탭 네비게이션: "핵심" "완전" 정보 탭
```

#### 개선안 6: 와이어프레임 안내 개선 (낮음 우선순위)
```
- "Figma에 와이어프레임 생성하기" 배지를 더 눈에 띄게:
  * 배경색 추가 + 아이콘 추가 (Figma 로고)
  * 클릭 시 Figma 플러그인 설치 가이드 모달
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| SSE 스트리밍 확대 + 진행률 표시 | **높음** | 생성 대기 시간이 길수 있음 |
| 에러 처리 개선 | **높음** | 현재 에러 메시지가 너무 단순 |
| 생성 취소 기능 | 중간 | 실수가 있을 때 빠져나갈 방법 필요 |
| 생성 완료 알림 | 중간 | 사용자 경험 향상 |
| 테이블 모바일 최적화 | 중간 | 모바일 사용자 불편함 |
| 와이어프레임 안내 개선 | 낮음 | 기능은 이미 있음 |

---

## 4. 반응형 디자인

### 현재 상태
- Tailwind CSS 사용
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- 주요 반응형 처리:
  - 사이드바: `lg:pl-60` (1024px 이상에서만 고정)
  - 헤더: `sm:flex hidden` (검색 버튼)
  - 대시보드: `md:grid-cols-2 lg:grid-cols-4` (카드 레이아웃)
  - 테이블: `overflow-x-auto` (가로 스크롤)

**코드 근거**: 
- `src/app/globals.css` (Tailwind 정의)
- 다양한 page.tsx 파일들에서 responsive classes 사용

### 문제점

1. **모바일-태블릿 간격 일관성 부족**:
   - `md` (768px)와 `lg` (1024px) 사이에 불명확한 처리
   - 태블릿 가로 (800-900px)에서 사이드바가 여전히 표시되지 않음 (lg 필요)

2. **터치 영역 크기 미달**:
   - 버튼 높이 대부분 `h-8` (32px) 또는 `h-7` (28px)
   - 모바일 권장 최소 높이: 44px (iOS), 48px (Android)
   - 네비게이션 메뉴 아이템 터치 영역이 너무 작음

3. **모바일 입력 필드 크기**:
   - Input: `h-8` (32px)
   - Textarea: `min-h-16` (64px)
   - 모바일에서 입력 시 손가락이 입력 필드를 가릴 수 있음

4. **패딩/마진 불일관**:
   - 데스크톱: `p-6`, 모바일: 정의되지 않거나 동일 (`p-6`)
   - 모바일에서 화면 양쪽 패딩이 과도할 수 있음 (화면 너비가 좁음)

5. **모바일 메뉴 토글 없음**:
   - 사이드바 토글 버튼이 헤더에 없음
   - 모바일에서 사이드바가 숨겨지면 접근할 방법이 없을 수 있음

6. **이미지/차트 반응형 처리 부족**:
   - Mermaid 다이어그램이 `overflow-x-auto`로만 처리
   - 와이어프레임 시뮬레이션 이미지가 반응형이 아님

7. **타블렛 가로 모드 레이아웃**:
   - 특정 기기(태블릿 가로)에서 레이아웃이 어색할 수 있음 (lg만 고정)

### 개선 제안

#### 개선안 1: 모바일 우선 설계로 전환 (높음 우선순위)
```
CSS:
- 기본: 모바일 레이아웃 (p-4, h-10 버튼)
- md: 태블릿 레이아웃 (p-5)
- lg: 데스크톱 레이아웃 (p-6, 사이드바 고정)

HTML 예시:
<Button size="default" className="h-10 md:h-9">
  (모바일 44px, 데스크톱 36px)
</Button>
```

#### 개선안 2: 터치 영역 최소화 (높음 우선순위)
```
- 모바일에서 모든 상호작용 요소의 최소 높이: 44px
- 버튼 사이즈:
  * 모바일: h-10 (40px)
  * 데스크톱: h-8 (32px)
- Input 필드:
  * 모바일: min-h-12 (48px)
  * 데스크톱: h-8 (32px)
```

#### 개선안 3: 적응형 사이드바 (중간 우선순위)
```
- md (768px): 축소된 사이드바 (아이콘 + 텍스트)
- lg (1024px): 전체 사이드바
- 모바일: 토글 드로어 (헤더에 메뉴 아이콘 추가)

코드:
<Sidebar 
  variant={screenSize === 'mobile' ? 'drawer' : screenSize === 'tablet' ? 'compact' : 'full'}
/>
```

#### 개선안 4: 패딩/마진 일관성 (중간 우선순위)
```
Container 패딩:
- 모바일 (< 640px): px-4, py-4
- 태블릿 (640px - 1024px): px-5, py-5
- 데스크톱 (> 1024px): px-6, py-6

전역 CSS:
.container { @apply px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6; }
```

#### 개선안 5: 모바일 메뉴 접근성 (중간 우선순위)
```
- 헤더에 메뉴 아이콘 추가 (모바일 < lg)
- 클릭 시 사이드바를 슬라이드 드로어로 표시
- 배경 오버레이 (마찬가지로 스와이프로 닫기 지원)
```

#### 개선안 6: 이미지/차트 반응형 처리 (중간 우선순위)
```
Mermaid 다이어그램:
- max-width: 100%
- height: auto
- 다이어그램 크기 조정 가능하도록 resize 컨트롤 추가

와이어프레임:
- 컨테이너: max-width: 100%, overflow-x-auto
- 이미지/SVG: max-width: 100%
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| 모바일 우선 설계 | **높음** | 모바일 사용자 경험 향상 |
| 터치 영역 최소화 | **높음** | 모바일에서 조작 어려움 |
| 적응형 사이드바 | 중간 | 화면 공간 활용 개선 |
| 패딩/마진 일관성 | 중간 | 전체적으로 더 정돈된 UI |
| 모바일 메뉴 접근성 | 중간 | 모바일 네비게이션 필요 |
| 이미지/차트 반응형 처리 | 중간 | 다양한 기기에서 콘텐츠 표시 |

---

## 5. 에러 처리 UX

### 현재 상태
- Next.js 에러 바운더리 구현:
  - `src/app/(dashboard)/error.tsx`: 대시보드 에러 처리
  - 에러 메시지 + "다시 시도" 버튼 표시
  - AlertCircle 아이콘 + 빨간색 텍스트 (text-red-500)

- 라우트 에러:
  - `notFound()` 호출 시 자동으로 404 처리
  - 명시적 not-found.tsx 파일 없음 (Next.js 기본값 사용)

- API 에러:
  - fetch 실패 시 toast.error() 호출 (sonner 라이브러리)
  - 예: "조직 정보를 불러오지 못했습니다."

**코드 근거**:
- `src/app/(dashboard)/error.tsx`
- `src/app/(auth)/login/login-form.tsx` (line 31-35)
- 다양한 페이지에서 `toast.error()` 사용

### 문제점

1. **에러 페이지 너무 단순**:
   - 에러 제목과 메시지만 표시
   - 어떤 종류의 에러인지 사용자가 모름 (네트워크? 서버? 권한?)
   - "다시 시도" 버튼만 있고 다른 옵션 없음

2. **에러 다시 시도 로직이 불명확**:
   - error.tsx의 reset() 함수가 무엇을 하는지 사용자가 모름
   - 여러 번 실패 시 무엇을 해야 하는지 정보 부족

3. **not-found 페이지 부재**:
   - 명시적 not-found.tsx 파일이 없음
   - 404 에러가 발생하면 기본 Next.js 페이지 표시
   - 현재 조직/프로젝트에 대한 안내 없음

4. **필드 수준 폼 검증 에러 부족**:
   - login-form.tsx에서 "비밀번호가 일치하지 않습니다" 메시지는 있지만
   - 실시간 필드 검증 피드백이 없음 (예: 이메일 형식 오류)

5. **로그아웃 후 리다이렉트 에러 처리 부족**:
   - Supabase 인증이 만료되었을 때 사용자 안내가 불명확
   - 로그인 페이지로 자동 리다이렉트되지만 "세션 만료" 같은 메시지 없음

6. **파일 업로드 에러 처리**:
   - 큰 파일 업로드 실패 시 에러 메시지가 불명확할 수 있음
   - 업로드 진행률 표시 부족

7. **타임아웃 에러 처리**:
   - 느린 네트워크에서 요청이 타임아웃되면 특별한 메시지가 없음
   - "네트워크 오류가 발생했습니다" 일괄 처리

### 개선 제안

#### 개선안 1: 에러 페이지 개선 (높음 우선순위)
```
에러 페이지 레이아웃:
- 에러 아이콘 (AlertCircle)
- 에러 제목: "페이지를 불러올 수 없습니다"
- 에러 설명: "요청한 페이지를 찾을 수 없습니다. 다음을 시도해보세요."
- 제안 사항 (에러 타입별):
  * 404: "프로젝트를 삭제했거나 접근 권한이 없을 수 있습니다."
  * 403: "이 페이지에 접근할 권한이 없습니다."
  * 500: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
- 행동:
  * "다시 시도" 버튼
  * "대시보드로 돌아가기" 링크
  * "지원팀에 문의" 링크 (에러 ID 포함)
```

#### 개선안 2: 명시적 not-found 페이지 (높음 우선순위)
```
/app/not-found.tsx 생성:
- 404 아이콘
- "페이지를 찾을 수 없습니다"
- "요청한 페이지가 삭제되었거나 존재하지 않을 수 있습니다."
- "대시보드로 돌아가기" 버튼
- 사용자가 속한 조직의 활성 프로젝트 목록 표시 (빠른 복구)
```

#### 개선안 3: 폼 필드 검증 (중간 우선순위)
```
login-form, signup-form:
- 실시간 검증:
  * 이메일: 입력 후 포커스 아웃 시 "유효한 이메일 형식이 아닙니다" 표시
  * 비밀번호: 8자 이상 실시간 체크 (체크마크 표시)
- 폼 제출 시:
  * 모든 필드 오류 한 번에 표시
  * 첫 오류 필드로 포커스 이동
  * 에러 메시지 위치: 필드 아래 (이미 있음)
```

#### 개선안 4: 세션 만료 처리 (중간 우선순위)
```
글로벌 에러 핸들러:
- 401 Unauthorized 감지
- 토스트 알림: "세션이 만료되었습니다. 다시 로그인해주세요."
- 2초 후 /login으로 리다이렉트
- 로그인 전 페이지 저장했다가 로그인 후 복귀 (redirect query param)

코드:
// useEffect in root layout or middleware
if (response.status === 401) {
  toast.error("세션이 만료되었습니다.");
  setTimeout(() => router.push('/login?redirect=' + window.location.pathname), 2000);
}
```

#### 개선안 5: 파일 업로드 에러 (중간 우선순위)
```
업로드 실패 처리:
- 파일 크기 초과: "최대 10MB까지 업로드 가능합니다."
- 지원하지 않는 형식: "PDF, DOCX, TXT 파일만 지원합니다."
- 네트워크 오류: "업로드 중단. 다시 시도하시겠습니까?"
- 진행률 표시: 업로드 진행 상황을 프로그레스 바로 표시
```

#### 개선안 6: 타임아웃 처리 (낮음 우선순위)
```
fetch 타임아웃 (AbortController):
- 기본 타임아웃: 30초
- 타임아웃 오류 메시지: "요청 시간이 초과되었습니다. 인터넷 연결을 확인하고 다시 시도해주세요."
- 자동 재시도: 1회 (지수 백오프)
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| 에러 페이지 개선 | **높음** | 에러 경험이 사용자 신뢰도에 영향 |
| 명시적 not-found 페이지 | **높음** | 현재 기본 Next.js 페이지만 표시 |
| 폼 필드 검증 | 중간 | 사용자 입력 오류 조기 감지 |
| 세션 만료 처리 | 중간 | 현재 처리가 명확하지 않음 |
| 파일 업로드 에러 | 중간 | 실제 사용 시 자주 발생 |
| 타임아웃 처리 | 낮음 | 드물게 발생하지만 있으면 좋음 |

---

## 6. 접근성(a11y)

### 현재 상태
- **ARIA 속성 부분 사용**:
  - Input: `aria-invalid` (폼 검증 시)
  - Button: `aria-expanded` (드롭다운 메뉴)
  - Dialog: 기본 Next.js 구조 (명시적 ARIA 역할 정의 부족)

- **포커스 관리**:
  - Button/Input: `focus-visible:ring-3 focus-visible:ring-ring/50` (비주얼 포커스 표시)
  - 다이얼로그 포커스 트래핑: 명시적 구현 없음 (shadcn/ui 컴포넌트 기본값)

- **색상 대비**:
  - 주요 텍스트: `text-foreground` (흑백 대비 좋음)
  - 보조 텍스트: `text-muted-foreground` (대비 낮을 수 있음)

- **키보드 네비게이션**:
  - Tab 키로 포커스 이동 가능
  - Cmd+K / Ctrl+K로 검색 다이얼로그 열기
  - 엔터 키로 폼 제출

**코드 근거**:
- `src/components/ui/input.tsx` (line 12)
- `src/components/ui/button.tsx` (line 9)
- `src/components/layout/search-dialog.tsx` (line 34)

### 문제점

1. **ARIA 레이블 부족**:
   - 아이콘 버튼에 aria-label이 없음
   - 예: 검색 다이얼로그의 X 버튼, 알림 벨 버튼
   - 아이콘만으로는 스크린 리더가 용도를 알 수 없음

2. **포커스 순서 문제**:
   - 모달 다이얼로그 내에서 포커스 트래핑이 구현되지 않음
   - Tab 키로 다이얼로그 배경 요소로 포커스 이동 가능성

3. **폼 라벨 부분 누락**:
   - 모든 Input에 연결된 Label이 있지만
   - 일부 검색 입력 필드에는 aria-label만 있고 Label 요소 없음

4. **색상 대비 불충분**:
   - `text-muted-foreground` (oklch(0.556 0 0))가 배경에 대해 대비율이 4.5:1 미만일 수 있음
   - WCAG AA 기준: 최소 4.5:1

5. **이미지 대체 텍스트 부족**:
   - Mermaid 다이어그램 SVG에 `alt` 속성 없음
   - 와이어프레임 스크린샷이 이미지이면 alt 필요

6. **언어 속성 명시**:
   - `<html lang="ko">`로 설정되어 있음 (좋음)
   - 영문 페이지 전환 시 `lang="en"`으로 변경되는지 불명확

7. **애니메이션 설정**:
   - `animate-spin`, `animate-pulse`가 기본으로 사용됨
   - `prefers-reduced-motion` 미디어 쿼리 처리 없음 (모션 민감증 사용자 고려 부족)

8. **링크와 버튼 구분**:
   - 일부 `<a>` 태그가 버튼처럼 사용됨 (스타일링만 Button)
   - 시맨틱 HTML 일관성 부족

### 개선 제안

#### 개선안 1: ARIA 레이블 추가 (높음 우선순위)
```
아이콘 버튼 모두에 aria-label 추가:
<button aria-label="검색 열기">
  <Search className="h-4 w-4" />
</button>

<button aria-label="알림 확인">
  <Bell className="h-4 w-4" />
</button>

<button aria-label="닫기">
  <X className="h-4 w-4" />
</button>
```

#### 개선안 2: 포커스 트래핑 (중간 우선순위)
```
Dialog/Modal 컴포넌트에 포커스 트래핑:
- 열 때: 처음 포커스 가능 요소로 포커스 이동
- 닫을 때: 이전 포커스 요소로 복귀
- Tab 키: 다이얼로그 내 포커스 순환

shadcn/ui Dialog가 이미 구현했을 가능성 높음 (확인 필요)
```

#### 개선안 3: 색상 대비 개선 (중간 우선순위)
```
muted-foreground 값 조정:
- 현재: oklch(0.556 0 0) (회색)
- 개선: oklch(0.475 0 0) (더 어두운 회색)
- 또는: 라이트 모드에서 조정된 색상 사용

대비율 확인:
- WCAG Contrast Checker 도구로 확인
- 최소 4.5:1 (일반 텍스트), 3:1 (대형 텍스트/UI 컴포넌트)
```

#### 개선안 4: 이미지 대체 텍스트 (중간 우선순위)
```
Mermaid 다이어그램:
<figure>
  <MermaidPreview code={code} />
  <figcaption>상태 다이어그램: 사용자 로그인 플로우</figcaption>
</figure>

와이어프레임 스크린샷:
<img 
  src={screenImage} 
  alt="모바일 홈 화면 와이어프레임: 헤더, 검색창, 프로젝트 목록"
/>
```

#### 개선안 5: 모션 설정 (중간 우선순위)
```
globals.css에 추가:
@media (prefers-reduced-motion: reduce) {
  * {
    @apply animate-none !important;
  }
}

또는 개별 애니메이션:
@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
}
```

#### 개선안 6: 링크와 버튼 명확화 (낮음 우선순위)
```
가이드라인:
- Link: 페이지 이동 (<Link> 또는 <a href="...">)
- Button: 액션 실행 (<button> 또는 <Button>)
- 예: "프로젝트 보기" (Link) vs "저장" (Button)

현재 코드에서 확인:
- <Link href="..."><Button>...</Button></Link>는 괜찮음
- <a href="..." className={buttonVariants()}> 형태로 링크 스타일링하는 경우 명확화
```

#### 개선안 7: 언어 동적 설정 (낮음 우선순위)
```
locale 변경 시 html lang 속성 업데이트:
// locale-provider.tsx에서
const setLocale = useCallback((next: Locale) => {
  setLocaleState(next);
  document.documentElement.lang = next; // lang 속성 동기화
  document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000`;
}, []);
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| ARIA 레이블 추가 | **높음** | 스크린 리더 사용자 필수 |
| 색상 대비 개선 | **높음** | WCAG 준수 필수 |
| 포커스 트래핑 | 중간 | 키보드 네비게이션 필수 |
| 이미지 대체 텍스트 | 중간 | 시각 장애인 접근성 |
| 모션 설정 | 중간 | 전정 장애/모션 민감증 고려 |
| 링크와 버튼 명확화 | 낮음 | 시맨틱 HTML |
| 언어 동적 설정 | 낮음 | 기술적 세부사항 |

---

## 7. 빈 상태(Empty State)

### 현재 상태
- **대시보드 빈 상태** (최근 생성 이력 없음):
  - Plus 아이콘 + "아직 생성 이력이 없습니다." 메시지
  - "TC 생성 또는 다이어그램 생성을 시작해보세요." 제안

- **프로젝트 빈 상태**:
  - FolderOpen 아이콘 + "프로젝트가 없습니다. 새 프로젝트를 만들어보세요." 메시지
  - 보관됨/휴지통 탭에도 각각의 empty state 있음

- **댓글 빈 상태**:
  - "아직 코멘트가 없습니다. 첫 번째로 의견을 남겨보세요." 메시지

**코드 근거**:
- `src/app/(dashboard)/[orgSlug]/dashboard/page.tsx` (line 194-199)
- `src/app/(dashboard)/[orgSlug]/projects/projects-client.tsx` (line 57-80)
- `src/components/comments/comment-section.tsx` (line 88-91)

### 문제점

1. **빈 상태에서 행동 유도 부족**:
   - "새 프로젝트를 만들어보세요"는 텍스트만 있고 버튼이 없음
   - 사용자가 어디로 가야 하는지 명확하지 않음

2. **컨텍스트별 다른 메시지 필요**:
   - 첫 방문인지 (아무 프로젝트도 없음) vs 모든 프로젝트 삭제 후인지 구분 안 함
   - 첫 방문이면 "시작하기" CTA 더 강조 필요

3. **아이콘 색상이 옅음**:
   - `opacity-30` 또는 `opacity-40`으로 매우 연하게 표시
   - 사용자가 무엇인지 파악하기 어려울 수 있음

4. **빈 상태 애니메이션/일러스트레이션 부재**:
   - 텍스트와 아이콘만 표시 (너무 단순)
   - 다른 SaaS 제품처럼 일러스트레이션 추가하면 좋을 텐데

5. **모바일에서 빈 상태 높이**:
   - `py-20` (80px 패딩)이 모바일 화면에서 너무 클 수 있음
   - 화면 공간 낭비

6. **검색 결과 빈 상태 없음**:
   - 검색해서 결과가 없을 때 명확한 빈 상태 표시 부재
   - "결과가 없습니다"라는 메시지만 있거나 아예 표시 안 함

7. **필터 적용 후 빈 상태**:
   - 프로젝트 필터링 후 결과 없으면 빈 상태 표시해야 함
   - 현재는 스켈레톤 또는 "로딩" 상태가 계속 표시될 수 있음

### 개선 제안

#### 개선안 1: CTA 버튼 추가 (높음 우선순위)
```
프로젝트 빈 상태:
<div className="flex flex-col items-center justify-center py-12 text-center">
  <FolderOpen className="mb-4 h-16 w-16 text-muted-foreground/50" />
  <h3 className="text-lg font-semibold">프로젝트가 없습니다</h3>
  <p className="mt-2 text-sm text-muted-foreground">
    첫 프로젝트를 만들어 QA 자동화를 시작하세요.
  </p>
  <Button onClick={() => openCreateProjectDialog()} className="mt-6">
    + 새 프로젝트 만들기
  </Button>
</div>

대시보드 빈 상태:
<div className="text-center">
  <Plus className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
  <p className="font-medium">아직 생성 이력이 없습니다.</p>
  <p className="mt-1 text-sm text-muted-foreground">
    기획 문서를 업로드하여 테스트케이스, 다이어그램, 와이어프레임을 자동 생성하세요.
  </p>
  <div className="mt-6 flex justify-center gap-2">
    <Button variant="outline" onClick={() => router.push(`/${orgSlug}/generate`)}>
      TC 생성 시작
    </Button>
    <Button onClick={() => router.push(`/${orgSlug}/diagrams`)}>
      다이어그램 생성
    </Button>
  </div>
</div>
```

#### 개선안 2: 첫 사용자 vs 일반 사용자 구분 (중간 우선순위)
```
// 데이터 기반 구분
const isFirstVisit = projectCount === 0 && !hasEverCreatedProject;

{isFirstVisit ? (
  <FirstTimeEmptyState /> // "시작 가이드" 형태, 더 자세한 설명
) : (
  <EmptyState /> // "프로젝트를 다시 만들어보세요" 간단한 형태
)}
```

#### 개선안 3: 아이콘 색상 강화 (중간 우선순위)
```
// 기존
<FolderOpen className="mb-4 h-12 w-12 opacity-30" />

// 개선
<FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/60" />

또는 테마 컬러 사용:
<div className="mb-4 rounded-full bg-primary/10 p-3 w-fit mx-auto">
  <FolderOpen className="h-8 w-8 text-primary" />
</div>
```

#### 개선안 4: 일러스트레이션 추가 (낮음 우선순위)
```
// SVG 일러스트레이션 추가
<div className="mb-6 flex justify-center">
  <svg className="h-24 w-24 text-muted-foreground/30">
    {/* 간단한 폴더 일러스트레이션 */}
  </svg>
</div>

또는 Lucide의 다양한 아이콘 조합으로 일러스트레이션 효과 생성
```

#### 개선안 5: 검색 결과 빈 상태 (중간 우선순위)
```
// search-dialog.tsx에서
{query && !hasResults && (
  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
    <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
    <p className="font-medium text-muted-foreground">검색 결과가 없습니다</p>
    <p className="text-xs text-muted-foreground/60 mt-1">
      다른 검색어를 시도해보세요.
    </p>
  </div>
)}
```

#### 개선안 6: 모바일 빈 상태 최적화 (낮음 우선순위)
```
// 모바일에서 패딩 감소
<div className="flex flex-col items-center justify-center py-12 md:py-20">
  {/* ... */}
</div>
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| CTA 버튼 추가 | **높음** | 사용자 행동 유도 중요 |
| 첫 사용자 구분 | 중간 | 온보딩 경험 향상 |
| 아이콘 색상 강화 | 중간 | 가독성 개선 |
| 일러스트레이션 추가 | 낮음 | 미적 개선 (필수 아님) |
| 검색 결과 빈 상태 | 중간 | 검색 경험 개선 |
| 모바일 빈 상태 최적화 | 낮음 | 모바일 공간 활용 |

---

## 8. 로딩 상태

### 현재 상태
- **Skeleton 로딩** (생성 결과 페이지):
  - `animate-pulse`를 이용한 스켈레톤 화면
  - `bg-muted` 배경의 회색 박스로 콘텐츠 형태 미리 표시

- **Spinner 로딩**:
  - `h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent`
  - JobStatusDisplay에서 "생성하고 있습니다..." 메시지와 함께 표시

- **문자열 로딩 메시지**:
  - "코멘트를 불러오는 중..." (텍스트만)
  - "로딩 중..." (기본)

**코드 근거**:
- `src/app/(dashboard)/[orgSlug]/loading.tsx` (line 1-22)
- `src/components/job-status-display.tsx` (line 32-44)
- `src/components/comments/comment-section.tsx` (line 86)

### 문제점

1. **Skeleton이 전체 페이지에만 있음**:
   - 특정 섹션 로딩 시 skeleton 없음
   - 예: 댓글 로딩, 버전 히스토리 로딩 등에서 텍스트만 표시

2. **로딩 시간 예측 어려움**:
   - 언제쯤 로드될지 표시 없음
   - 프로그레스 바나 예상 시간 표시 부족

3. **로딩 메시지 일관성 부족**:
   - "생성하고 있습니다..." vs "로딩 중..." vs "불러오는 중..." 
   - 메시지 톤이 불일관

4. **Spinner 크기 불일관**:
   - `h-8 w-8` (32px)로 고정
   - 다른 로딩 맥락에서는 크기가 다를 수 있음

5. **스켈레톤 너무 많음**:
   - 전체 페이지 스켈레톤이 로드되면 사용자가 클릭하려 할 때 실제 요소가 나타나면서 레이아웃 시프트 발생 가능

6. **모바일 로딩 상태 불명확**:
   - 모바일에서 긴 로딩 시간 시 사용자가 무엇이 일어나는지 모를 수 있음
   - "계속 기다리세요" vs "재시도" 판단 어려움

7. **SSE 로딩 진행률 없음**:
   - SSE 스트리밍 중 진행률을 보여주지 않음
   - 초기 생성은 폴링(5초)만 사용해서 진행률 표시 불가

### 개선 제안

#### 개선안 1: Skeleton 컴포넌트 라이브러리화 (높음 우선순위)
```
// src/components/ui/skeleton.tsx 생성
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

// 사용 예
<Skeleton className="h-4 w-3/4" />
<Skeleton className="h-10 w-full mt-2" />

// 섹션별 스켈레톤
export function CommentSectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-24" /> {/* 제목 */}
      <Skeleton className="h-24 w-full" /> {/* 입력 필드 */}
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
```

#### 개선안 2: 로딩 메시지 표준화 (중간 우선순위)
```
로딩 메시지 템플릿:
- 페이지 로드: "페이지를 불러오는 중입니다..."
- 데이터 로드: "[데이터명]을 불러오는 중입니다..."
- 작업 실행: "[작업명]을 실행 중입니다..."
- 파일 업로드: "[파일명]을 업로드하는 중입니다..."

예시:
- "댓글을 불러오는 중입니다..."
- "프로젝트를 생성하는 중입니다..."
- "테스트케이스를 생성하는 중입니다..."
```

#### 개선안 3: 프로그레스 인디케이터 (높음 우선순위)
```
SSE 생성 시:
- 전체 진행률: 0% → 100%
- 단계 표시: "1/3 파일 분석" → "2/3 TC 생성" → "3/3 최적화"
- 예상 남은 시간: "약 30초 남음"

구현:
<ProgressBar value={progress} max={100} /> {/* 0-100 */}
<p className="text-sm text-muted-foreground">
  단계 {currentStep} / {totalSteps}: {stepName}
</p>
<p className="text-xs text-muted-foreground/60">
  예상 남은 시간: {estimatedTimeRemaining}
</p>
```

#### 개선안 4: 로딩 Timeout 처리 (중간 우선순위)
```
30초 이상 로딩 시:
- 경고 메시지: "시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요."
- "재시도" 버튼 활성화
- 로그에 "slow load" 기록

코드:
useEffect(() => {
  const timeout = setTimeout(() => {
    setSlowLoading(true);
  }, 30000);
  return () => clearTimeout(timeout);
}, []);

{slowLoading && (
  <p className="text-sm text-amber-600">
    시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요.
    <button onClick={() => router.refresh()}>재시도</button>
  </p>
)}
```

#### 개선안 5: Spinner 크기 가이드 (낮음 우선순위)
```
// src/components/ui/spinner.tsx
export function Spinner({ size = "default" }: { size?: "xs" | "sm" | "default" | "lg" }) {
  const sizeMap = {
    xs: "h-4 w-4",
    sm: "h-6 w-6",
    default: "h-8 w-8",
    lg: "h-12 w-12",
  };
  return (
    <div className={cn("animate-spin rounded-full border-4 border-primary border-t-transparent", sizeMap[size])} />
  );
}

// 사용
<Spinner size="lg" /> {/* 페이지 로딩 */}
<Spinner size="sm" /> {/* 버튼 로딩 */}
<Spinner size="xs" /> {/* 인라인 로딩 */}
```

#### 개선안 6: 레이아웃 시프트 방지 (중간 우선순위)
```
// Hydration 완료 후 동적 콘텐츠 표시
export function DeferredContent({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children : <Skeleton className="h-40 w-full" />;
}

// 사용
<Suspense fallback={<CommentSkeleton />}>
  <CommentSection />
</Suspense>
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| Skeleton 컴포넌트 라이브러리화 | **높음** | 일관된 로딩 UX |
| 프로그레스 인디케이터 | **높음** | SSE 로딩 진행률 표시 필요 |
| 로딩 메시지 표준화 | 중간 | 메시지 일관성 |
| Timeout 처리 | 중간 | 무한 로딩 상태 대비 |
| Spinner 크기 가이드 | 낮음 | 코드 재사용성 |
| 레이아웃 시프트 방지 | 낮음 | 미적 개선 |

---

## 9. 폼 검증 및 피드백

### 현재 상태
- **HTML 검증**: `required`, `minLength={8}`, `type="email"` 등
- **커스텀 검증**:
  - 슬러그 유효성: `SLUG_REGEX.test(slug)` (소문자, 숫자, 하이픈만 허용)
  - 비밀번호 일치: `if (password !== passwordConfirm)`
- **실시간 피드백**:
  - 슬러그 입력 중 실시간 검증 (유효함 🟢, 오류 🔴)
  - 슬러그 유효하지 않으면 제출 버튼 disabled
- **에러 표시**: 필드 아래 텍스트 (text-destructive 또는 text-amber-600)

**코드 근거**:
- `src/app/(auth)/onboarding/page.tsx` (line 160-172)
- `src/app/(auth)/login/login-form.tsx` (line 31)
- `src/app/(auth)/signup/signup-form.tsx` (line 30-33)

### 문제점

1. **서버 검증 부재**:
   - 클라이언트 검증만 있고 서버에서 재검증 안 할 가능성 (보안 이슈)
   - 예: 이미 있는 조직 슬러그로 생성 시도 → "이미 사용 중인 슬러그"

2. **실시간 검증 범위 부족**:
   - 슬러그만 실시간 검증 (색상 피드백)
   - 이메일, 비밀번호, 조직 이름은 실시간 검증 없음

3. **필드 수준 에러 메시지 불충분**:
   - 비밀번호: 길이 요구사항만 표시 (특수문자? 대소문자 섞여야 함?)
   - 이메일: 형식 오류만 알 수 있음 (중복 체크 없음)

4. **폼 제출 시 다중 오류 처리**:
   - 여러 필드에 오류 있으면 첫 번째 오류만 토스트로 표시
   - 사용자가 모든 오류를 한 번에 볼 수 없음

5. **성공 피드백 부족**:
   - 필드 검증 성공 시 체크마크 표시 없음 (슬러그 제외)
   - 사용자가 필드를 제대로 입력했는지 확신 없음

6. **폼 상태 전환 중 사용성**:
   - 폼 제출 중 "제출 중..." 상태에서도 입력 수정 가능 (혼란 야기)
   - 재제출 방지 로직이 버튼 disabled만 의존

7. **프로젝트/조직 중복 검사 없음**:
   - 같은 이름의 프로젝트/조직 생성 가능
   - 또는 검사는 하지만 실시간 피드백 없음

8. **비밀번호 강도 표시 없음**:
   - 비밀번호 입력 시 강도(약/중간/강)를 표시하지 않음
   - 사용자가 안전한 비밀번호인지 모름

### 개선 제안

#### 개선안 1: 서버 검증 강화 (높음 우선순위)
```
// API 라우트에서 재검증
POST /api/auth/signup:
- 이메일 중복 확인
- 조직 슬러그 중복 확인
- 비밀번호 정책 검증 (길이, 복잡도)

응답:
{
  "errors": {
    "email": "이미 가입된 이메일입니다.",
    "orgSlug": "이미 사용 중인 슬러그입니다."
  }
}
```

#### 개선안 2: 실시간 중복 검사 (중간 우선순위)
```
// 조직 슬러그 중복 검사 (디바운스)
useEffect(() => {
  if (!slug || !SLUG_REGEX.test(slug)) return;
  
  const timer = setTimeout(async () => {
    const res = await fetch(`/api/organization/slug-check?slug=${slug}`);
    const { available } = await res.json();
    setSlugError(available ? null : "이미 사용 중인 슬러그입니다.");
  }, 500);
  
  return () => clearTimeout(timer);
}, [slug]);
```

#### 개선안 3: 비밀번호 강도 표시 (중간 우선순위)
```
// 비밀번호 강도 계산
function getPasswordStrength(pwd: string) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[!@#$%^&*]/.test(pwd)) score++;
  return score; // 0-5
}

// UI
<PasswordStrengthMeter strength={strength} />
<p className="text-xs text-muted-foreground">
  {strength === 1 && "약함: 더 복잡한 비밀번호를 만들어주세요."}
  {strength === 2 && "중간: 특수문자를 추가하면 더 안전합니다."}
  {strength >= 3 && "강함: 좋은 비밀번호입니다."}
</p>
```

#### 개선안 4: 다중 필드 오류 표시 (중간 우선순위)
```
// 폼 제출 시 모든 오류 수집
const errors = validateForm({ email, password, passwordConfirm });
if (Object.keys(errors).length > 0) {
  setErrors(errors); // 모든 필드에 오류 표시
  return;
}

// UI: 필드별 오류 표시
{errors.email && (
  <p className="text-xs text-destructive">{errors.email}</p>
)}
{errors.password && (
  <p className="text-xs text-destructive">{errors.password}</p>
)}
```

#### 개선안 5: 성공 피드백 추가 (중간 우선순위)
```
// 필드 검증 성공 시 체크마크
<div className="relative">
  <Input {...props} />
  {isValid && !error && (
    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
  )}
</div>

// 또는 border 색상 변경
<Input 
  className={cn(
    isValid && !error && "border-green-500 ring-green-500/20"
  )}
  {...props}
/>
```

#### 개선안 6: 폼 제출 중 사용성 개선 (낮음 우선순위)
```
// 제출 중 상태에서 입력 필드 비활성화
<Input disabled={isSubmitting} />

// 또는 폼 전체 비활성화
<fieldset disabled={isSubmitting}>
  <Input />
  <Button type="submit">{isSubmitting ? "제출 중..." : "제출"}</Button>
</fieldset>
```

#### 개선안 7: 폼 검증 라이브러리 도입 (낮음 우선순위)
```
// React Hook Form + Zod
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  email: z.string().email("유효한 이메일 형식이 아닙니다."),
  password: z.string().min(8, "8자 이상이어야 합니다."),
});

const { register, formState: { errors }, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| 서버 검증 강화 | **높음** | 보안 + 사용자 경험 |
| 실시간 중복 검사 | 중간 | UX 향상 |
| 비밀번호 강도 표시 | 중간 | 보안 인식 향상 |
| 다중 필드 오류 표시 | 중간 | 사용자 불편함 제거 |
| 성공 피드백 추가 | 중간 | 확신감 제공 |
| 폼 제출 중 사용성 | 낮음 | 엣지 케이스 처리 |
| 폼 검증 라이브러리 | 낮음 | 코드 유지보수성 (선택사항) |

---

## 10. 알림/토스트

### 현재 상태
- **Sonner 라이브러리** 사용
  - `toast.error("메시지")` - 에러 알림
  - `toast.success("메시지")` - 성공 알림 (아직 사용 확인 안 됨)

- **사용 위치**:
  - 로그인/회원가입 오류
  - 조직 정보 로드 오류
  - 폼 검증 오류
  - 네트워크 오류

**코드 근거**:
- `src/app/(auth)/login/login-form.tsx` (line 49, 89)
- `src/app/(auth)/onboarding/page.tsx` (line 85-86)
- `src/app/(dashboard)/[orgSlug]/settings/settings-general.tsx` (line 67, 88)

### 문제점

1. **성공 피드백 부족**:
   - 프로젝트 생성 성공, 설정 저장 성공 시 토스트 없음
   - 사용자가 성공 여부를 확인하기 어려움

2. **토스트 위치와 색상**:
   - Sonner의 기본 위치와 색상이 디자인과 맞는지 확인 필요
   - 다크모드에서 가독성 체크 필요

3. **토스트 지속 시간 불일관**:
   - 다양한 종류의 알림이 같은 시간 표시 (보통 3초 + 1초 애니메이션)
   - 중요한 알림(권한 없음)과 일시적 알림(저장됨)을 구분하지 않음

4. **알림 안내 없음**:
   - 대부분 에러 토스트만 있음
   - 정보 알림(예: "프로젝트가 보관되었습니다") 부족

5. **네트워크 상태 알림 없음**:
   - 인터넷 연결이 끊어졌을 때 명확한 알림이 없음
   - 요청이 실패할 때만 알림

6. **복합 작업 진행 상황 표시 부족**:
   - 여러 단계 작업(예: 프로젝트 생성 + 초기 설정) 시 진행 상황 불명확
   - "작업을 수행 중입니다..." 같은 장시간 토스트 필요

7. **토스트 중복 방지 없음**:
   - 같은 에러가 여러 번 발생하면 여러 토스트 표시 가능
   - "재시도" 버튼이 없음

8. **배경 음성 알림(Notification API) 미지원**:
   - 탭이 활성화되지 않은 상태에서 생성 완료 같은 중요 알림이 사라질 수 있음
   - 브라우저 알림 (desktop notification) 미구현

### 개선 제안

#### 개선안 1: 성공 피드백 추가 (높음 우선순위)
```
// 프로젝트 생성/저장 성공
if (res.ok) {
  toast.success("프로젝트가 생성되었습니다.");
  router.push(`/${orgSlug}/projects/${projectId}`);
}

// 설정 저장 성공
if (res.ok) {
  toast.success("설정이 저장되었습니다.");
}

// 프로젝트 보관
toast.success("프로젝트가 보관되었습니다.");
```

#### 개선안 2: 토스트 타입 확대 (중간 우선순위)
```
// Sonner 제공 타입 활용
toast.error(msg);     // 에러
toast.success(msg);   // 성공
toast.info(msg);      // 정보
toast.warning(msg);   // 경고
toast.loading(msg);   // 로딩

// 사용 예
toast.info("프로젝트가 보관되었습니다.");
toast.warning("이 작업은 되돌릴 수 없습니다.");
toast.loading("생성 중...");
```

#### 개선안 3: 네트워크 상태 모니터링 (중간 우선순위)
```
// window 이벤트 리스너
useEffect(() => {
  const handleOnline = () => toast.success("인터넷 연결되었습니다.");
  const handleOffline = () => toast.error("인터넷 연결이 끊겼습니다.");
  
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);
```

#### 개선안 4: 토스트 중복 방지 (중간 우선순위)
```
// 최근 토스트 메시지 추적
const lastToastRef = useRef<string | null>(null);

function showToast(msg: string, type: "error" | "success") {
  if (lastToastRef.current === msg) return; // 중복 방지
  
  lastToastRef.current = msg;
  if (type === "error") toast.error(msg);
  else toast.success(msg);
  
  // 5초 후 초기화
  setTimeout(() => { lastToastRef.current = null; }, 5000);
}
```

#### 개선안 5: 토스트 액션 버튼 (낮음 우선순위)
```
// Sonner의 action 옵션
toast.error("생성에 실패했습니다.", {
  action: {
    label: "재시도",
    onClick: () => retryGeneration(),
  },
  duration: 5000, // 더 긴 시간
});

toast.success("프로젝트가 생성되었습니다.", {
  action: {
    label: "열기",
    onClick: () => router.push(`/${orgSlug}/projects/${projectId}`),
  },
  duration: 4000,
});
```

#### 개선안 6: 데스크톱 알림 (낮음 우선순위)
```
// 중요 알림 시 브라우저 알림
async function showImportantNotification(title: string, options?: any) {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    new Notification(title, options);
  } else if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification(title, options);
    }
  }
}

// 생성 완료 시
showImportantNotification("FireQA", {
  body: "TC 생성이 완료되었습니다.",
  icon: "/logo.png",
});
```

#### 개선안 7: 토스트 지속 시간 규칙 (낮음 우선순위)
```
토스트 지속 시간 가이드라인:
- 에러/경고: 6000ms (사용자가 읽을 시간 필요)
- 성공: 3000ms (긍정적 피드백)
- 정보: 4000ms (중간)
- 로딩: Infinity (수동 종료)

코드:
toast.error(msg, { duration: 6000 });
toast.success(msg, { duration: 3000 });
toast.info(msg, { duration: 4000 });
toast.loading(msg, { duration: Infinity });
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| 성공 피드백 추가 | **높음** | 사용자 확신감 필수 |
| 토스트 타입 확대 | **높음** | 정보 계층 제공 |
| 네트워크 상태 모니터링 | 중간 | 오프라인 사용자 경험 |
| 토스트 중복 방지 | 중간 | 사용자 경험 개선 |
| 토스트 액션 버튼 | 중간 | 사용자 편의성 |
| 데스크톱 알림 | 낮음 | 배경 작업 알림 (선택사항) |
| 토스트 지속 시간 규칙 | 낮음 | 일관성 (미세 개선) |

---

## 11. 다크모드

### 현재 상태
- **Tailwind CSS 다크 모드**:
  - `html.dark` 클래스 기반
  - CSS custom properties (--foreground, --background, --primary, etc.)
  - OKLCH 색상 공간 사용 (perceptually uniform)

- **다크모드 색상** (src/app/globals.css):
  - Background: oklch(0.145 0 0) (어두운 회색)
  - Foreground: oklch(0.985 0 0) (거의 흰색)
  - Primary: oklch(0.922 0 0) (밝은 주황)
  - 조화로운 색상 대비 제공

- **토글 기능**: 현재 코드에서 다크모드 토글 UI를 찾을 수 없음

**코드 근거**:
- `src/app/globals.css` (line 86-118)

### 문제점

1. **다크모드 토글 UI 부재**:
   - 설정이나 헤더에 다크모드 토글 버튼이 없음
   - 사용자가 다크모드를 수동으로 활성화할 방법이 없음
   - 시스템 설정(`prefers-color-scheme`)만 따를 가능성

2. **다크모드 상태 지속성**:
   - localStorage에 저장하는지 확인 필요
   - 새로고침 후 사용자 선택이 유지되지 않을 수 있음

3. **전환 애니메이션 부족**:
   - 다크모드 전환 시 색상이 즉시 변경됨
   - 부드러운 전환 애니메이션이 없어서 어색할 수 있음

4. **특정 컴포넌트 다크모드 처리 부족**:
   - 다이어그램(Mermaid) SVG가 다크모드에서 가독성 저하
   - 와이어프레임 이미지도 다크 테마 미지원

5. **코드 스니펫 다크모드**:
   - Markdown 또는 코드 블록이 다크모드에 최적화되지 않을 수 있음

6. **이미지/일러스트레이션 다크모드**:
   - 배경색 기반 일러스트레이션이 다크모드에서 보이지 않을 수 있음

7. **다크모드 색상 수정 필요**:
   - muted-foreground (oklch(0.708 0 0))가 다크 배경에서 대비가 낮을 수 있음

### 개선 제안

#### 개선안 1: 다크모드 토글 UI 추가 (높음 우선순위)
```
// 헤더 또는 설정에 토글 버튼 추가
<button 
  onClick={toggleDarkMode}
  aria-label="다크모드 전환"
  className="p-2 hover:bg-muted rounded-lg"
>
  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
</button>

또는 설정에서:
<label className="flex items-center gap-3">
  <span>다크모드</span>
  <input 
    type="checkbox" 
    checked={isDark}
    onChange={toggleDarkMode}
  />
</label>
```

#### 개선안 2: 다크모드 상태 지속성 (중간 우선순위)
```
// src/lib/dark-mode.ts
export function getDarkModePreference() {
  const saved = localStorage.getItem("darkMode");
  if (saved !== null) return saved === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function setDarkModePreference(isDark: boolean) {
  localStorage.setItem("darkMode", isDark ? "true" : "false");
  document.documentElement.classList.toggle("dark", isDark);
}

// 초기화 (RootLayout)
useEffect(() => {
  const isDark = getDarkModePreference();
  document.documentElement.classList.toggle("dark", isDark);
}, []);
```

#### 개선안 3: 다크모드 전환 애니메이션 (중간 우선순위)
```
// globals.css에 추가
html {
  transition: color 0.3s ease, background-color 0.3s ease;
}

/* 또는 더 섬세한 전환 */
* {
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* 애니메이션을 꺼야 하는 경우 */
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
```

#### 개선안 4: Mermaid 다크모드 지원 (중간 우선순위)
```
// Mermaid 설정에 다크 테마 추가
import mermaid from "mermaid";

const isDark = document.documentElement.classList.contains("dark");
mermaid.initialize({ 
  startOnLoad: true, 
  theme: isDark ? "dark" : "default",
  securityLevel: "loose",
});

// 또는 다이어그램별 설정
<div className="mermaid" data-theme={isDark ? "dark" : "default"}>
  {mermaidCode}
</div>
```

#### 개선안 5: 이미지/일러스트레이션 다크모드 (낮음 우선순위)
```
// CSS 필터로 이미지 반전
@media (prefers-color-scheme: dark) {
  img.light-theme-only {
    filter: invert(1) hue-rotate(180deg);
  }
}

// 또는 picture 요소 사용
<picture>
  <source srcSet="light.svg" media="(prefers-color-scheme: light)" />
  <source srcSet="dark.svg" media="(prefers-color-scheme: dark)" />
  <img src="light.svg" alt="Description" />
</picture>
```

#### 개선안 6: 색상 대비 미세 조정 (낮음 우선순위)
```
// globals.css에서 다크모드 muted-foreground 조정
.dark {
  --muted-foreground: oklch(0.65 0 0); /* 0.708 → 0.65로 더 어둡게 */
}

// WCAG AA 준수 확인 후 조정
```

#### 개선안 7: 다크모드 시스템 설정 동기화 (낮음 우선순위)
```
// 시스템 설정 변경 감지
useEffect(() => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = (e: MediaQueryListEvent) => {
    if (localStorage.getItem("darkMode") === null) {
      document.documentElement.classList.toggle("dark", e.matches);
    }
  };
  mediaQuery.addEventListener("change", handleChange);
  return () => mediaQuery.removeEventListener("change", handleChange);
}, []);
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| 다크모드 토글 UI 추가 | **높음** | 사용자가 설정할 수 있는 방법 필요 |
| 다크모드 상태 지속성 | **높음** | 사용자 경험 일관성 |
| 다크모드 전환 애니메이션 | 중간 | 미적 개선 |
| Mermaid 다크모드 지원 | 중간 | 다이어그램 가독성 |
| 이미지 다크모드 | 낮음 | 향후 개선사항 |
| 색상 대비 미세 조정 | 낮음 | 선택사항 |
| 시스템 설정 동기화 | 낮음 | 깔끔한 구현 |

---

## 12. 협업 UX

### 현재 상태
- **댓글 섹션**:
  - 각 생성 작업(TC, 다이어그램, 와이어프레임, 기획서 개선)의 결과 페이지 하단
  - 댓글 작성, 댓글 목록 표시, 대댓글 지원
  - Supabase 실시간 구독으로 새 댓글 자동 새로고침

- **활동 로그** (`/activity`):
  - 프로젝트별 활동 기록 조회 가능
  - 코드에서 구현 확인 안 됨 (API 라우트만 있음)

- **알림 벨**:
  - 헤더에 알림 벨 아이콘
  - 읽지 않은 알림 수 표시
  - 코드에서 구현 확인 안 됨

- **실시간 업데이트**:
  - Supabase `postgres_changes` 구독으로 새 댓글 감지
  - 자동 새로고침 없이 사용자가 수동으로 댓글 새로고침

**코드 근거**:
- `src/components/comments/comment-section.tsx` (line 49-64)
- `src/app/(dashboard)/[orgSlug]/activity/page.tsx` (존재 확인)
- `src/components/layout/notification-bell.tsx` (존재 확인)

### 문제점

1. **댓글 알림 부재**:
   - 새 댓글이 달렸을 때 사용자에게 알림이 없음
   - 댓글이 달렸는지 알려면 페이지를 다시 열어야 함

2. **대댓글 기능 불명확**:
   - 코드에서 CommentThread 컴포넌트가 있지만 구현 확인 안 됨
   - 대댓글 UI 표시 여부 불명확

3. **멘션 기능 없음**:
   - @사용자 같은 멘션 기능이 없음
   - 특정 팀원에게 직접 알림을 보낼 수 없음

4. **댓글 수정/삭제 기능 부재**:
   - 댓글 작성 후 수정/삭제할 수 없음
   - 잘못된 댓글을 지우거나 수정할 방법이 없음

5. **활동 로그 표시 부족**:
   - 누가 언제 작업을 생성했는지 기록이 없음
   - 최종 수정자 정보 부재

6. **댓글 스레드 길이 관리**:
   - 댓글이 많아지면 페이지 로드 시간 증가
   - 페이지네이션이나 "더 보기" 기능 없음

7. **협업 활동 대시보드 부재**:
   - 팀 멤버들의 최근 활동을 한눈에 볼 수 없음
   - 누가 무엇을 하고 있는지 파악 어려움

8. **댓글 권한 관리**:
   - 누가 댓글을 작성/수정/삭제할 수 있는지 코드에서 명확하지 않음
   - 팀원이 다른 사람의 댓글을 삭제할 수 있을 가능성

9. **댓글 구독 해제 옵션 없음**:
   - 특정 작업의 댓글 알림을 끌 방법이 없음

### 개선 제안

#### 개선안 1: 댓글 알림 (높음 우선순위)
```
// 새 댓글 감지 시 알림
useEffect(() => {
  const channel = supabase
    .channel(`comments:job:${jobId}`)
    .on("postgres_changes", 
      { event: "INSERT", schema: "public", table: "Comment" },
      (payload) => {
        toast.info(`${payload.new.authorName}님이 새 댓글을 달았습니다.`);
        fetchComments();
      }
    )
    .subscribe();
}, [jobId]);

// 또는 브라우저 알림
new Notification("FireQA", {
  body: "팀원이 당신의 TC 생성 결과에 댓글을 달았습니다.",
});
```

#### 개선안 2: 멘션 기능 (중간 우선순위)
```
// 댓글 입력 필드에 @멘션 자동완성
<CommentInput
  onMention={(mention) => {
    // 팀원 목록 표시
    suggestTeamMembers(mention);
  }}
  onSubmit={handleSubmit}
/>

// 멘션된 사용자에게 알림
POST /api/comments:
- 댓글 저장
- 멘션된 사용자 추출 (@user)
- 알림 생성 및 전송
```

#### 개선안 3: 댓글 수정/삭제 (중간 우선순위)
```
// 댓글 항목에 액션 메뉴 추가
<CommentItem>
  <div className="comment-actions">
    {currentUserId === comment.authorId && (
      <>
        <button onClick={editComment}>수정</button>
        <button onClick={deleteComment}>삭제</button>
      </>
    )}
  </div>
</CommentItem>

// 또는 우클릭 컨텍스트 메뉴
```

#### 개선안 4: 활동 로그 표시 (중간 우선순위)
```
// 작업 결과 페이지 상단에 활동 정보 추가
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <User className="h-4 w-4" />
  <span>{createdBy} 생성 • {createdAt}</span>
  {lastModifiedBy && (
    <>
      <Dot className="h-2 w-2" />
      <span>{lastModifiedBy} 수정 • {lastModifiedAt}</span>
    </>
  )}
</div>
```

#### 개선안 5: 협업 활동 대시보드 (중간 우선순위)
```
// /activity 페이지 개선
- 전체 팀 활동 피드
- 실시간 활동 표시
- 필터: 사용자별, 작업 타입별, 날짜별

레이아웃:
<ActivityFeed>
  {activities.map(activity => (
    <ActivityItem
      user={activity.author}
      action={activity.action}
      resource={activity.resourceName}
      timestamp={activity.createdAt}
    />
  ))}
</ActivityFeed>
```

#### 개선안 6: 댓글 페이지네이션 (낮음 우선순위)
```
// 댓글이 많을 경우 페이지네이션
<CommentSection>
  {comments.slice(0, PAGE_SIZE).map(comment => (...))}
  {hasMore && (
    <Button onClick={() => setPage(page + 1)}>
      더 보기 ({remaining}개)
    </Button>
  )}
</CommentSection>

또는 Intersection Observer로 무한 스크롤
```

#### 개선안 7: 댓글 구독 관리 (낮음 우선순위)
```
// 작업 결과 페이지에 "알림 구독" 토글
<div className="flex items-center gap-2">
  <input 
    type="checkbox" 
    checked={isSubscribed}
    onChange={toggleSubscription}
  />
  <label>이 작업의 댓글 알림받기</label>
</div>
```

#### 개선안 8: 댓글 권한 강화 (낮음 우선순위)
```
// 댓글 삭제 권한: 작성자 또는 관리자만
const canDeleteComment = currentUserId === comment.authorId || isAdmin;

// 또는 댓글 수정 권한: 1시간 이내만
const canEditComment = 
  currentUserId === comment.authorId && 
  (now - comment.createdAt) < 60 * 60 * 1000;
```

### 우선순위
| 개선안 | 우선순위 | 이유 |
|--------|---------|------|
| 댓글 알림 | **높음** | 협업 필수 기능 |
| 멘션 기능 | 중간 | 팀원 간 소통 강화 |
| 댓글 수정/삭제 | 중간 | 사용자 경험 개선 |
| 활동 로그 표시 | 중간 | 투명성 및 추적 |
| 협업 활동 대시보드 | 중간 | 팀 현황 파악 |
| 댓글 페이지네이션 | 낮음 | 성능 최적화 |
| 댓글 구독 관리 | 낮음 | 알림 커스터마이징 |
| 댓글 권한 강화 | 낮음 | 보안 + UX |

---

## 종합 우선순위 매트릭스

### 높은 우선순위 (즉시 개선 권장)
| 카테고리 | 개선안 | 영향 | 난이도 | 추정 시간 |
|---------|--------|------|--------|----------|
| 온보딩 | 온보딩 가이드 추가 | 높음 | 중간 | 3-5시간 |
| 네비게이션 | 모바일 네비게이션 재설계 | 높음 | 높음 | 8-12시간 |
| 생성 결과 | SSE 스트리밍 + 진행률 | 높음 | 높음 | 6-8시간 |
| 생성 결과 | 에러 처리 개선 | 높음 | 중간 | 4-6시간 |
| 반응형 | 모바일 우선 설계 | 높음 | 중간 | 4-6시간 |
| 반응형 | 터치 영역 최소화 | 높음 | 낮음 | 2-3시간 |
| 에러 처리 | 에러 페이지 개선 | 높음 | 낮음 | 2-3시간 |
| 에러 처리 | not-found 페이지 | 높음 | 낮음 | 1-2시간 |
| 접근성 | ARIA 레이블 추가 | 높음 | 낮음 | 2-3시간 |
| 접근성 | 색상 대비 개선 | 높음 | 낮음 | 1-2시간 |
| 빈 상태 | CTA 버튼 추가 | 높음 | 낮음 | 1-2시간 |
| 로딩 | Skeleton 라이브러리화 | 높음 | 중간 | 3-4시간 |
| 로딩 | 프로그레스 인디케이터 | 높음 | 중간 | 3-4시간 |
| 폼 검증 | 서버 검증 강화 | 높음 | 중간 | 4-6시간 |
| 알림 | 성공 피드백 추가 | 높음 | 낮음 | 2-3시간 |
| 알림 | 토스트 타입 확대 | 높음 | 낮음 | 1-2시간 |
| 다크모드 | 다크모드 토글 UI | 높음 | 낮음 | 2-3시간 |
| 다크모드 | 다크모드 상태 지속성 | 높음 | 낮음 | 1-2시간 |
| 협업 | 댓글 알림 | 높음 | 중간 | 3-4시간 |

**총 예상 시간**: 약 80-120 시간 (10-15 주 소요)

### 중간 우선순위 (2-3개월 내 개선)
- 온보딩: 초대 코드 UX 개선, 슬러그 입력 가이드
- 네비게이션: 프로젝트 이동 경험, 네비게이션 단순화
- 생성 결과: 생성 취소 기능, 생성 완료 알림, 테이블 모바일 최적화
- 반응형: 적응형 사이드바, 패딩/마진 일관성
- 기타: 다양한 개선사항들

### 낮은 우선순위 (4개월 이상)
- 미적 개선: 일러스트레이션, 애니메이션
- 고급 기능: 폼 라이브러리, 데스크톱 알림
- 최적화: 성능 미세 조정, 접근성 세부 조정

---

## 종합 평가

### 강점 ✅
1. **기본적 구조 탄탄**: Next.js 16, React 19, shadcn/ui로 모던 스택 구성
2. **다크모드 지원**: OKLCH 색상으로 일관된 다크모드 제공
3. **다국어 지원**: 한국어/영문 지원 (i18n 구현)
4. **실시간 기능**: Supabase 구독으로 협업 기능 기초 구현
5. **에러 바운더리**: Next.js error.tsx로 에러 처리 구조 있음
6. **토스트 알림**: Sonner로 사용자 피드백 기본 제공

### 약점 ❌
1. **모바일 사용성 부족**: 반응형 처리가 lg breakpoint에만 집중
2. **접근성 미흡**: ARIA 속성, 색상 대비 등 부분적
3. **로딩 UX 단순**: 진행률, 상세 스켈레톤 부족
4. **협업 기능 미완**: 알림, 멘션, 댓글 수정 등 부족
5. **에러 처리 단순**: 에러 메시지와 재시도 옵션 부족
6. **온보딩 부족**: 튜토리얼이나 가이드 부족

### 개선 방향
1. **모바일 우선 설계로 전환** (가장 중요)
2. **협업 UX 강화** (댓글 알림, 멘션 등)
3. **접근성 개선** (WCAG 준수)
4. **로딩/에러 UX 개선** (진행률, 재시도 등)
5. **온보딩 경험 강화** (첫 사용자 안내)

---

## 부록: 구현 로드맵

### Phase 1: 핵심 개선 (1-2개월)
1. 모바일 네비게이션 재설계 (높은 우선순위)
2. 에러 페이지 개선 (높은 우선순위)
3. 빈 상태 CTA 추가 (높은 우선순위)
4. ARIA 레이블 추가 (높은 우선순위)
5. 색상 대비 개선 (높은 우선순위)

### Phase 2: 생성 결과 UX (2-3개월)
1. SSE 스트리밍 + 진행률 표시
2. 에러 처리 개선
3. Skeleton 라이브러리화
4. 프로그레스 인디케이터

### Phase 3: 협업 기능 (3-4개월)
1. 댓글 알림
2. 멘션 기능
3. 활동 대시보드
4. 댓글 수정/삭제

### Phase 4: 완성도 (4-5개월)
1. 폼 검증 강화
2. 온보딩 가이드
3. 네비게이션 단순화
4. 기타 미세 개선

---

**작성일**: 2026-04-04
**분석 대상 버전**: feat/agent-integration 브랜치
**분석 범위**: 프론트엔드 UX/UI 측면만 (백엔드/인프라 제외)
