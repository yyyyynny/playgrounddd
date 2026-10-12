// 이스터에그 — 키보드로 yyyyynny 를 치거나 제목을 연달아 5번 누르면 열린다. 관리자님이 좋아하는 노래를 영상과 함께 무작위 재생
// 곡 목록 [{ v: 영상 ID, s: 시작 초, t: 표시 이름 }] 은 한눈에 읽히지 않게 섞어 둔다(JSON → base64 → 뒤집기). 비밀 보장은 아니다
const LIST = '=0VfiALuqjLsszLrrjIirDykAKOISV0VRJiOiQnIsYTMxojIzJCLigTZSFDSKljemlGciojI2Jyes0nIkS46sa66su46gQYnsTIsqz5isDykAKOIcG66cG66cWZ7iojI0JCLzYjOiMnIsIyahN2NjRlehRDcMJiOiYnI7xSfigJsrzbnsjKsszLltDykAKOIoyJ7M2J7iojI0JCLwojIzJCLic2d6pFSXhkT3onWiojI2Jyes0nIlNXdvhEIyV3bZBCdhBSehR3Ug8GdgQnbhdFI5xGbhVmUgkEITCo4gUURCpVQEJiOiQnIsUzNxojIzJCLiUUZON0UB5EMN5ENiojI2Jyes0nIACr6sCL7Me66gMJgiDiLptWd0JiOiQnIsIDN6IyciwiIJVTd2NWRFlFca9mI6IidisHL9JCpKyOsayOs4qOlF2OoyuOITCo4gwqprDrmsDKnsLiOiQnIsIDN6IyciwiIRN0aDhkQhtES5QnI6Iidis3W';
export const eggSongs = () => JSON.parse(new TextDecoder().decode(
  Uint8Array.from(atob([...LIST].reverse().join('')), (c) => c.charCodeAt(0))));

const CODE = 'YYYYYNNY'; // 한글 입력 상태에서도 되게 글자가 아니라 눌린 키(e.code)로 본다
const TAPS = 5;          // 제목을 이만큼 연달아 누르면 열린다
const TAP_GAP = 600;     // 연달아로 치는 간격(ms)

// 시트는 data-locked 라 닫기 버튼으로만 닫힌다(제목을 5번 넘게 눌러도 바깥 클릭으로 닫히지 않게).
// sheet: 이스터에그 dialog, trigger: 제목 요소, open: 시트 여는 함수, onOpen: 열기 직전에 할 일(퀴즈 소리 멈춤)
export function initEgg({ sheet, trigger, open, onOpen }) {
  const songs = eggSongs();
  let yt = null, cur = -1, typed = '', taps = 0, last = 0, fails = 0;

  function next() {
    if (!window.YT?.Player || (yt && !yt.loadVideoById)) return; // 유튜브 API · 플레이어 준비 전
    let i;
    do { i = Math.floor(Math.random() * songs.length); } while (i === cur && songs.length > 1);
    cur = i;
    const s = songs[i];
    sheet.querySelector('#eggTitle').textContent = s.t;
    if (yt) { yt.loadVideoById({ videoId: s.v, startSeconds: s.s }); return; }
    yt = new window.YT.Player('eggYt', {
      videoId: s.v,
      playerVars: { start: s.s, autoplay: 1, playsinline: 1, rel: 0 },
      events: {
        onStateChange: (e) => { if (e.data === 1) fails = 0; else if (e.data === 0) next(); }, // 끝나면 다음 곡
        // 유튜브가 막은 영상(퍼가기 금지 등)은 건너뛴다. 전부 막혔으면 멈춘다
        onError: () => { if (++fails < songs.length) next(); }
      }
    });
  }
  function show() {
    if (sheet.open) return;
    onOpen();
    open(sheet);
    next();
  }

  document.addEventListener('keydown', (e) => {
    if (!/^Key[A-Z]$/.test(e.code)) return;
    typed = (typed + e.code[3]).slice(-CODE.length);
    if (typed === CODE) { typed = ''; show(); }
  });
  trigger.addEventListener('click', (e) => {
    taps = e.timeStamp - last < TAP_GAP ? taps + 1 : 1;
    last = e.timeStamp;
    if (taps >= TAPS) { taps = 0; show(); }
  });
  sheet.querySelector('#eggNext').addEventListener('click', next);
  sheet.addEventListener('close', () => yt?.pauseVideo?.());
}
