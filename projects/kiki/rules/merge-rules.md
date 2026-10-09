# kIkI 머지 규칙

> 출처: `yyyyynny/kiki` 의 `docs/CI_가이드.md` · `.github/workflows/ci.yml` · `CLAUDE.md` (스냅샷 d88fc01, 2026-07-20).
> 원본에 없는 규칙은 만들지 않았다. 보호 규칙(Ruleset)의 **실제 적용 여부는 미확인** —
> 원본이 "사람이 GitHub 웹에서 직접 켜는 설정"이라고 명시하며, 이 세션에서는 설정 화면을 조회할 수 없다.

## 1. 브랜치와 PR

| 항목 | 규칙 |
|---|---|
| 머지 대상 | `main` (기본 브랜치) |
| 작업 브랜치 | `claude/**` — push 시 CI 자동 실행 |
| 머지 방식 | PR 필수 (Require a pull request before merging) |
| 필요 승인 수 | **0** (혼자 운영) |
| 강제 푸시 | 차단 (Block force pushes) |

## 2. 머지 차단 조건 (필수 상태 체크)

| 체크 이름 | 내용 |
|---|---|
| `빌드 · 린트` | `./gradlew lintDebug` → `./gradlew assembleDebug` (디버그 APK 업로드) |
| `단위 테스트` | `./gradlew testDebugUnitTest` |

- 두 잡은 병렬 실행. 둘 다 초록이어야 머지 버튼이 활성화된다.
- 권장 옵션 2개 모두 ON:
  - Require branches to be up to date before merging (`main` 최신 반영 후 검사 통과)
  - Do not require status checks on creation (새 브랜치 생성 자체가 막히는 문제 방지)
- 체크 이름은 CI 가 최소 1회 돈 뒤에야 설정 화면에서 고를 수 있다.
- job `name:` 을 바꾸면 보호 규칙의 체크 이름도 새 이름으로 다시 등록해야 한다.
- 설정 위치: Settings → Rules → Rulesets → New branch ruleset (Enforcement: Active, Target: default branch). 구버전 화면이면 Settings → Branches.

## 3. PR 올리기 전 로컬 검증

```bash
./gradlew lintDebug testDebugUnitTest assembleDebug
```

## 4. CI 실패 시

- Actions 탭 → 실패 실행 → 실패 잡 → ❌ 단계 펼침. 실패한 잡만 재실행(Re-run failed jobs)하면 된다.
- 일시적 네트워크(`Could not resolve ...`)나 SDK 설치 오류는 재실행, 린트 · 테스트 · 컴파일 오류는 코드 수정.
- 산출물: `kiki-debug-apk`(14일), `lint-report` · `unit-test-report`(7일, 실패해도 업로드).

## 5. 머지 전 확인 (CLAUDE.md 기준)

- [ ] 툴체인 고정 버전을 바꿨다면 CLAUDE.md "빌드/툴체인 버전" 표와 `ci.yml` 을 **함께** 갱신했는가
- [ ] 식별자(패키지 `com.langsense.app`, 클래스 `LangSenseAccessibilityService`, `Theme.LangSense`, Gradle `rootProject.name`)를 건드리지 않았는가
- [ ] 키 로깅 · 화면 내용 수집 · 외부 전송이 추가되지 않았는가 (접근성 서비스 오용 방지)
- [ ] 문서와 코드가 다르면 **코드가 진실** — 코드를 바꿨다면 CLAUDE.md · `docs/` 를 맞췄는가

## 6. Dependabot

github-actions · gradle 주간 점검. 액션이 커밋 SHA 로 고정돼 있어 Dependabot 이 "새 SHA + 주석의 버전 태그"를 갱신하는 PR 을 올린다. 메이저 업그레이드도 PR 로만 제안되므로 CI 통과를 확인한 뒤 머지한다.
