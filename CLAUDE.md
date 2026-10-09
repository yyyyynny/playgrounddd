# CLAUDE.md — playgrounddd (잡다한 웹 실험실)

> 공통 행동 규칙(호칭 · 한글 · 자율 실행 범위 · 검증 표기)은 `~/.claude/CLAUDE.md` 를 따른다.
> 이 파일은 저장소 전체에 적용되는 구조 · 머지 · 저장소 규칙이다. Llove · kIkI 저장소의 운영 방식을 참고해 이 실험실에 맞게 정리했다.

## 성격

작은 웹 실험을 마음껏 시도하는 곳. 제품 배포용이 아니다. 실험 하나 = 폴더 하나.

## 폴더 구조

```
playgrounddd/
├── CLAUDE.md
├── README.md
├── .claude/
│   ├── skills/        ← 저장소 전체에 적용되는 스킬 (이름/SKILL.md)
│   └── agents/        ← 저장소 전체에 적용되는 에이전트 (이름.md)
└── <실험이름>/         ← 실험(프로젝트)별 폴더. 소문자-하이픈
    ├── README.md      ← 무엇을 실험하는지 한 단락
    └── (index.html, style.css, js/ ...)
```

- 실험 코드는 루트에 흩뿌리지 않고 반드시 자기 폴더 안에 둔다. 폴더 간 import · 공유 파일은 만들지 않는다(필요해지면 `shared/` 를 그때 만든다).
- 특정 실험에만 쓰는 스킬 · 에이전트는 `<실험이름>/.claude/skills|agents/` 에 둔다. 전체에 쓰는 것만 루트 `.claude/` 에 둔다.
- 스킬 · 에이전트를 추가 · 삭제하면 아래 "적용 스킬" 표를 함께 고친다.

## 적용 스킬 (`.claude/skills/`)

Llove 저장소의 `.agents/skills/` 에서 실험 성격에 맞는 것만 골랐다(전부 Llove 전용 내용 없음을 확인).

| 분류 | 스킬 | 언제 |
|---|---|---|
| 디자인 | frontend-design · redesign-existing-projects · web-design-guidelines · apple-design | 새 UI 설계 · 기존 UI 개선 · UI 접근성/UX 점검 · 제스처/물리적 모션 |
| 애니메이션 | animate · animation-vocabulary · find-animation-opportunities · improve-animations · review-animations | 애니메이션 설계 · 용어 찾기 · 빠진 곳 탐색 · 감사 · 리뷰 |
| 제작 · 검증 | prototype · pick-ui-library · webapp-testing | 여러 시안 비교 · 라이브러리 선택 · Playwright 로 실제 동작 확인 |

제외한 것(필요하면 추가): 취향이 강한 디자인 스킬(brutalist · gpt-taste · minimalist 등), 이미지 생성(imagegen-*), mcp-builder, ask-sonner, writing-guidelines.

## 머지 규칙

> 기준: Llove 저장소(`yyyyynny/Llove`)에 실제 적용된 `main` 규칙세트와 저장소 설정.
> playgrounddd 적용 현황(2026-10-09, 최고 관리자님 캡처 확인): General · 보안 기능 · `main` 규칙세트(삭제 금지 · 강제 푸시 금지 · PR 필수 · 승인 0명 · 우회 없음) 적용 완료. **필수 점검 2개는 CI 생성 후 추가 예정**, Actions 권한은 본인 확인(캡처 미확인), Pages는 관리자님 직접 진행. 남은 일은 `인수인계_노트.md` 참조.

1. 작업은 `claude/**` 브랜치에서 하고 `main` 으로는 PR 로만 합친다. 직접 push 불가.
2. 승인 인원 0명이라 본인이 병합한다. 병합 방식은 merge · squash · rebase 모두 허용.
3. `main` 규칙세트(활성, 우회 가능 계정 없음): 브랜치 삭제 금지 · 강제 푸시 금지 · PR 필수 · 필수 점검 2개. 옛 방식 브랜치 보호는 쓰지 않는다(규칙세트가 대신함).
4. 필수 점검 2개: `HTML / JS 기본 검증` · `기능 동작 테스트 (jsdom)`. 병합 전에 `main` 최신과 맞춰져 있어야 하고(strict), 브랜치를 새로 만들 때는 점검을 강제하지 않는다.
5. ⚠️ 이 저장소에는 아직 `.github/workflows/ci.yml` 이 없다. 필수 점검은 해당 이름의 job 이 한 번 돈 뒤에야 규칙세트에 등록되므로, CI 파일을 먼저 만들고 실행시킨 뒤에 필수 점검을 켠다(먼저 켜면 병합이 막힌다).
6. 머지 전 확인: 비밀값 없음 · 모델/음성/대용량 바이너리 없음 · 실험 폴더 README 최신 · 새 스킬/에이전트면 위 "적용 스킬" 표 갱신.
7. 큰 작업은 배치로 나누고 **배치마다 커밋**한다(컨텍스트가 끊겨도 `git log` 로 진행 파악).

### 저장소 설정 기준값 (Llove 현행)

| 항목 | 값 |
|---|---|
| 공개 여부 | 공개(public) |
| 비밀값 스캔 · 푸시 시 비밀값 차단 · Dependabot 보안 업데이트 | 켜짐 |
| 병합 후 브랜치 자동 삭제 · 자동 병합(auto-merge) · 위키 | 꺼짐 |
| 이슈 | 켜짐 |
| Actions 허용 범위 | 모든 액션 허용, 커밋 해시 고정 불필요 |
| 워크플로 기본 권한 | 읽기 전용 (워크플로의 PR 승인 불가) |
| Actions 시크릿 · 배포 키 · 웹훅 | 0개 |
| GitHub Pages | main 루트에서 배포, HTTPS 강제 (Llove 전용 — 이 저장소 적용 여부는 별도 결정) |
| 로컬 | git 사용자 지정 설정 없음(origin 만) · `.claude/settings*.json` 없음, `.claude/` 에는 skills 만 |

## 저장소 규칙

- **코드 주석 · 커밋 메시지 · 문서는 전부 한글.** (식별자 · 라이브러리 이름 · 명령어는 원문 유지)
- 세션 시작 시 `인수인계_노트.md` 를 먼저 읽고, 작업 후 갱신한다.
- **문서와 코드가 다르면 코드가 진실.** 줄 수 · 변수명 · 수치는 추측하지 말고 코드를 확인해 쓴다.
- JS 를 고치면 `node --check` 로 문법 검증. 실행 · 테스트하지 않은 코드는 "미검증"으로 표기.
- 정적 웹 기본: 빌드 없이 열리는 `index.html` + `style.css` + `js/`. 인라인 onclick 이 전역 함수를 쓰는 실험은 `<script type="module">` 로 바꾸지 않는다.
- API 키 · 토큰 · 시크릿은 저장소에 커밋 금지(프론트 노출 금지, 필요하면 서버리스 프록시에서만). 외부 API 를 실제 호출하는 기능은 플래그로 봉인해 두고 최고 관리자님 승인 후에만 켠다.
- 모델 · 음성 · 대용량 바이너리(`*.pth *.onnx *.ckpt *.pt *.bin *.wav *.mp3` 등)는 커밋 금지(`.gitignore` 로 막는다).
- 의존성 최소화. 쓰면 `package-lock.json` 으로 고정하고 `npm ci --ignore-scripts` 로 설치한다. Node 는 24 기준.
- CI 를 만들 때: `permissions: contents: read`, 액션은 커밋 SHA 고정, `concurrency` 로 이전 실행 취소, 트리거는 PR · `main` · `claude/**` push · 수동 실행, Dependabot 은 npm · github-actions 주간.
- 디자인: 한 실험 안에서는 색 · 글자 · 모서리 · 모션을 CSS 변수 토큰으로 일관되게 정리한다. 이모지를 아이콘으로 쓰지 않고(단색 SVG), 다크/라이트에서 모두 확인한다. 모션은 사용자에게 불쾌감을 주지 않는 선에서 자유.
- 접근성: 모달 · 접이식 · 클릭 가능한 요소는 `dialog` / `details` / `button` 으로 만든다.
