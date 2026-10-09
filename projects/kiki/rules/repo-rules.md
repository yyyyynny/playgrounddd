# kIkI 저장소 규칙

> 출처: `yyyyynny/kiki` 의 `CLAUDE.md` · `.claude/settings.json` · `.github/` (스냅샷 d88fc01, 2026-07-20).
> 기능 상세는 원본 `docs/features.md` · `docs/architecture.md` 참조(이 폴더에 복제하지 않음).

## 1. 기준 원칙

- **문서와 코드가 다르면 코드가 진실(source of truth).**
- 모든 작업은 CLAUDE.md 와 `docs/` 하위 문서를 기준으로 수행.
- `.claude/settings.json`: `"language": "korean"`.

## 2. 불변 식별자 (표시 이름만 kIkI)

| 항목 | 값 |
|---|---|
| 패키지 / applicationId | `com.langsense.app` |
| 서비스 클래스 | `LangSenseAccessibilityService` |
| 테마 | `Theme.LangSense` |
| Gradle | `rootProject.name` |

사용자에게 보이는 문구만 kIkI. 위 식별자는 **절대 변경 금지**.

## 3. 지원 범위

| 항목 | 값 |
|---|---|
| minSdk | API 29 (Android 10) |
| compile / targetSdk | 35 |
| 제외 | API 36+ (Android 17 베타), One UI 9.x (베타) — 별도 분기 작성 금지, 추후 대응 |
| 주 타겟 기기 | Galaxy Tab S6 Lite, Galaxy Tab S9 FE+ |
| One UI | 3.x ~ 8.x (최대 8.5) |

## 4. 툴체인 (고정 — 변경 시 CLAUDE.md 표 + `ci.yml` 동시 갱신)

JDK 17 (Temurin) · Gradle 8.11.1 · AGP 8.7.3 · build-tools 35.0.0 · Node.js 24.
AGP 9.x 는 Gradle 9.1+ 요구로 보류. `coreKtx` · `lifecycle` 상한선도 AGP 9.x 업그레이드 때 함께 풀린다(`gradle/libs.versions.toml` 상단 주석).

## 5. 구현 원칙

- 외부 라이브러리 최소화 (AndroidX Core · Lifecycle 만 허용).
- 접근성 서비스는 키로깅 · 화면 내용 수집 · 외부 전송을 절대 하지 않는다. 모든 처리는 온디바이스, 디버그 로그는 언어 코드만. `typeViewTextChanged` 도 `isEditable` 여부만 보고 텍스트 내용은 읽지 않는다.
- `onKeyEvent` 는 항상 `false` 반환(이벤트 미소비).
- Android 14+ 는 `foregroundServiceType=specialUse` 필수.
- `ACTION_SET_TEXT` 가 안 되는 앱이 있어 클립보드 fallback 필수.
- 일본어는 삭제하지 않고 **주석 처리**(재도입 대비). `[일본어 비활성화]` 표식 유지.
- 래디얼 메뉴의 외형 · 모션 진실은 `assets/radialmenu.html` — 외형 변경은 Kotlin 이 아니라 이 HTML 에서.
- 설정은 `Prefs` 단일 진입점.

## 6. CI · 보안 설정

- 트리거: PR, `main` · `claude/**` push, 수동 실행. 같은 ref 의 이전 실행 자동 취소.
- `permissions: contents: read`, 릴리스 서명키는 CI 에 넣지 않는다.
- 액션은 커밋 SHA 고정 (태그 하이재킹 방어).
- Dependabot: github-actions · gradle 주간.
