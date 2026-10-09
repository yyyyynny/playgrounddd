# Llove 머지 규칙

> 출처: `yyyyynny/llove` 의 `docs/CI_가이드.md` · `.github/workflows/ci.yml` · `CLAUDE.md` (스냅샷 7fe6719, 2026-10-09).
> 원본에 없는 규칙은 만들지 않았다. GitHub 저장소 설정(보호 규칙)의 **실제 적용 여부는 미확인** —
> 원본 문서가 "최고 관리자님이 직접 적용"한다고 명시하며, 이 세션에서는 설정 화면을 조회할 수 없다.

## 1. 브랜치와 PR

| 항목 | 규칙 |
|---|---|
| 머지 대상 | `main` (GitHub Pages 배포 브랜치) |
| 작업 브랜치 | `claude/**` — push 시 CI 자동 실행 |
| 머지 방식 | PR 필수 (Require a pull request before merging) |
| 승인 인원 | 선택 사항(원본: "Require approvals — 인원 지정"은 선택) |

## 2. 머지 차단 조건 (필수 상태 체크)

두 체크가 모두 초록이어야 머지한다. 이름은 `ci.yml` 의 job `name:` 과 글자 그대로 일치해야 한다.

| 체크 이름 | 내용 |
|---|---|
| `HTML / JS 기본 검증` | `scripts/check-inline-js.mjs`(node --check) · `npm run check:html`(htmlhint) · `scripts/check-deploy.mjs` |
| `기능 동작 테스트 (jsdom)` | `npm ci --ignore-scripts` → `npm test` (`tests/run-all.cjs`) |

- 권장 옵션: Require branches to be up to date before merging, Do not allow bypassing(관리자 우회 불가).
- 체크 이름은 CI 가 최소 1회 돈 뒤에야 설정 화면 목록에 나타난다.
- job `name:` 을 바꾸면 보호 규칙의 체크 이름도 새 이름으로 다시 등록해야 한다.

## 3. PR 올리기 전 로컬 검증

```bash
node scripts/check-inline-js.mjs   # JS 문법
npm run check:html                 # HTML 구조 (먼저 npm ci)
node scripts/check-deploy.mjs      # 배포 전 정합성
npm test                           # jsdom 기능 테스트
```

## 4. 머지 전 최종 검수 체크리스트 (CLAUDE.md 원문 요약)

- [ ] `GROK_활성화` · `음성생성_활성화` 플래그가 승인 없이 바뀌지 않았는가
- [ ] API 키가 코드·git 기록에 없는가 (시크릿은 Cloudflare 에만)
- [ ] Worker 소스를 고쳤다면 Cloudflare 에 재배포했는가 (커밋만으로는 적용 안 됨)
- [ ] 게임 주소가 바뀌었다면 Worker 2개의 `허용_ORIGIN` 갱신 + 재배포
- [ ] Worker 적용 전 Cloudflare Rate limiting · AI 제공사 월 한도 확인
- [ ] `npm test` · `check:js` · `check:deploy` · `check:html` 전부 통과
- [ ] 변경분의 `innerHTML` · `insertAdjacentHTML` 에 외부·사용자 문자열이 이스케이프 없이 들어가지 않는가 (`/security-review` 가 실패하면 수동 점검)
- [ ] 파일 구조를 바꿨다면 CLAUDE.md "파일 구조" 섹션과 `index.html` 의 `<script>` 태그 목록을 함께 갱신했는가

## 5. 커밋 · 대규모 작업

- 큰 작업은 배치로 나누고 **배치마다 커밋** (컨텍스트가 끊겨도 `git log` 로 진행 상황 파악).
- 구조 변경 후에는 음성 인식 · 커스텀 테마 · Firebase · 게이트 플래그가 정상인지 검증하고 `tests/load.cjs` · `scripts/check-inline-js.mjs` 도 새 구조에 맞춰 갱신.

## 6. Dependabot

npm · github-actions 둘 다 주간 점검, 열린 PR 최대 5개. 업데이트 PR 도 위 두 체크를 통과해야 머지한다.
