# 음악 감상 퀴즈

유튜브 음원을 화면에 영상 없이 소리만 들려주고, 작곡가·시대와 작품명을 맞히는 감상 퀴즈. 곡 목록은 Notion 「🎼 음악 감상 목록」 32곡(`js/songs.js`). 재생은 공식 YouTube IFrame Player API를 화면 밖에 숨겨 쓰고(썸네일·제목 노출 없음), 진행 막대는 One UI 8.5 미디어 플레이어처럼 재생 중에 물결로 출렁인다. 전체 목록의 「듣기」도 외부 이동 없이 그 자리에서 재생되고, 집중 학습으로 고른 곡만 풀 수 있다.

## 실행

- 배포(예정): `https://yyyyynny.github.io/playgrounddd/music-quiz/` — 저장소 Pages 를 켜고 `main` 에 머지된 뒤
- 로컬: 저장소 루트에서 `python3 -m http.server 8000` → `http://localhost:8000/music-quiz/`
- `file://`(파일 더블클릭)로 열지 않는다. 모듈 스크립트와 유튜브 플레이어가 동작하지 않는다.

## 채점

전체 일치만 정답. 공백 · 따옴표류 · 가운뎃점(·) · `中` · 대소문자 차이는 무시한다(`js/grade.js`). 오답이면 정답에서 못 맞힌 글자(밑줄)와 내 답에서 틀린 글자(취소선)를 빨강으로 표시한다.

## 파일

| 파일 | 역할 |
|---|---|
| `js/songs.js` | 32곡 데이터 |
| `js/grade.js` | 정규화 · 정답 판정 · 글자 diff (테스트: `tests/grade.test.js`, 루트에서 `npm test`) |
| `js/player.js` | 숨긴 유튜브 플레이어 하나를 공유 |
| `js/wave.js` | 물결 진행 막대(canvas) |
| `js/app.js` | 화면 상태 · 이벤트 · localStorage |
