# Llove 저장소 규칙

> 출처: `yyyyynny/llove` 의 `CLAUDE.md` · `.github/` · `.gitignore` · `.mcp.json` (스냅샷 7fe6719, 2026-10-09).
> 상세 설계는 원본의 `언어_KNOWLEDGE_v5.md` · `언어_SYSTEM_v5.md` · `작업인계_노트.md` 참조(이 폴더에 복제하지 않음).

## 1. 구조 원칙

- 정적 웹앱, 빌드 없음. 최상위 = 관문 `index.html` + `Llove/`(본체) + `wchain/`('잇는' 끝말잇기 이세계).
- JS 는 **클래식 스크립트**로 전역 스코프 공유. `<script type="module">` 전환 금지(인라인 onclick · jsdom 테스트 때문).
- 로드 순서 = `index.html` 의 `<script src>` 순서. 임의 재배열 금지, `초기실행.js` 는 항상 마지막.
- 새 기능은 해당 기능 파일에 추가. 새 파일을 만들면 `index.html` 태그와 CLAUDE.md 파일 목록을 함께 갱신. `app.js` 로 되뭉치기 금지.

## 2. 절대 고정 항목

- 바텀 네비 `#g-bnav` 는 `.screen` 밖 독립 위치(z-index 200)
- Firebase 변수명은 KNOWLEDGE 13섹션 한글 변수명
- localStorage 키는 `plx_` 접두사
- API 키는 Cloudflare Workers 에만 (프론트 노출 금지)
- **`GROK_활성화` · `음성생성_활성화` 는 최고 관리자님 승인 없이 변경 금지**
- CI/Node.js 는 **Node 24**
- 확정 사항(KNOWLEDGE)은 임의 변경 금지

## 3. 게이트와 금지 파일

- Grok · 음성 생성은 플래그로 봉인. 모델·음성 파일은 레포에 절대 커밋 금지.
- `.gitignore` 가드: `*.pth *.onnx *.ckpt *.pt *.bin *.wav *.mp3 *.flac *.ogg`, `/models/ /voices/ /음성모델/`.

## 4. 디자인 규칙

- 기본은 기존 UI 토큰 재사용(`--bg --card --acc --txt` 등 파생 토큰). 컴포넌트 CSS 에서 `--c-*` raw 입력값 직접 참조 금지.
- 전면 개편처럼 새 비주얼 언어가 필요하면 새 토큰 허용(2026-09-23 완화) — 단 테마 5종 + 커스텀 전부 따라가게 하고 CLAUDE.md 의 변수 목록 갱신.
- 모서리 `--r-s/m/l`, 글자 11/12/13/14/16/18/22 7단, transition .15s/.25s/.4s 3단. 다크/라이트 전부 확인.
- 테두리는 입력·선택 요소에만, 135deg 그라디언트 · 바깥 발광 · 한글 uppercase 금지(업적 · 레벨업 · 잇 포탈 예외).
- 애니메이션은 방식 제한 없음. 유일한 기준은 사용자에게 불쾌감을 주지 않는 것.
- 이모지 아이콘 신규 사용 금지 → `.ic` + `<use href="#i-이름">`.

## 5. 코드 작업 규칙

- JS 를 고치면 `node --check` 의무.
- 불확실한 줄 수 · 변수명 · 클래스명 · 수치는 추측하지 말고 코드를 검색해 확인. 다른 저장소의 관례를 섞어 쓰지 않는다.

## 6. CI · 보안 설정 (원본 `ci.yml` · `dependabot.yml`)

- 트리거: PR, `main` · `claude/**` push, 수동 실행. 같은 ref 의 이전 실행은 자동 취소(concurrency).
- `permissions: contents: read` 로 토큰 최소화.
- 액션은 **커밋 SHA 고정**(태그 변조 방지), `npm ci --ignore-scripts`(설치 스크립트 차단), 외부 유료 서비스 미사용.
- Dependabot: npm · github-actions 주간.

## 7. 도구

- `.mcp.json`: Playwright MCP(`@playwright/mcp@latest`, 크로미움 경로 고정).
- 디자인 · 애니메이션 스킬 29개가 원본 `.agents/skills/` 에 있음 → 이 실험실의 `skills/` 인덱스 참조.
