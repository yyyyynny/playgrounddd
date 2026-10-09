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

1. 작업은 `claude/**` 브랜치에서 하고 `main` 으로는 PR 로만 합친다. 승인 인원은 0(혼자 운영), force push 금지.
2. PR 은 CI 가 초록이어야 머지한다. CI 는 `ci.yml` 이 생기면 실험 폴더별로 정적 검증(JS 문법 `node --check`, HTML 구조)을 돈다.
3. 머지 전 확인: 비밀값 없음 · 모델/음성/대용량 바이너리 없음 · 실험 폴더 README 최신 · 새 스킬/에이전트면 위 표 갱신.
4. 큰 작업은 배치로 나누고 **배치마다 커밋**한다(컨텍스트가 끊겨도 `git log` 로 진행 파악).
5. GitHub 보호 규칙(Ruleset)은 최고 관리자님이 웹에서 직접 설정한다. 적용 여부는 확인 전까지 "미확인".

## 저장소 규칙

- **문서와 코드가 다르면 코드가 진실.** 줄 수 · 변수명 · 수치는 추측하지 말고 코드를 확인해 쓴다.
- JS 를 고치면 `node --check` 로 문법 검증. 실행 · 테스트하지 않은 코드는 "미검증"으로 표기.
- 정적 웹 기본: 빌드 없이 열리는 `index.html` + `style.css` + `js/`. 인라인 onclick 이 전역 함수를 쓰는 실험은 `<script type="module">` 로 바꾸지 않는다.
- API 키 · 토큰 · 시크릿은 저장소에 커밋 금지(프론트 노출 금지, 필요하면 서버리스 프록시에서만). 외부 API 를 실제 호출하는 기능은 플래그로 봉인해 두고 최고 관리자님 승인 후에만 켠다.
- 모델 · 음성 · 대용량 바이너리(`*.pth *.onnx *.ckpt *.pt *.bin *.wav *.mp3` 등)는 커밋 금지(`.gitignore` 로 막는다).
- 의존성 최소화. 쓰면 `package-lock.json` 으로 고정하고 `npm ci --ignore-scripts` 로 설치한다. Node 는 24 기준.
- CI 를 만들 때: `permissions: contents: read`, 액션은 커밋 SHA 고정, `concurrency` 로 이전 실행 취소, 트리거는 PR · `main` · `claude/**` push · 수동 실행, Dependabot 은 npm · github-actions 주간.
- 디자인: 한 실험 안에서는 색 · 글자 · 모서리 · 모션을 CSS 변수 토큰으로 일관되게 정리한다. 이모지를 아이콘으로 쓰지 않고(단색 SVG), 다크/라이트에서 모두 확인한다. 모션은 사용자에게 불쾌감을 주지 않는 선에서 자유.
- 접근성: 모달 · 접이식 · 클릭 가능한 요소는 `dialog` / `details` / `button` 으로 만든다.
