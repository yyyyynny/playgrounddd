// 이스터에그 — 키보드로 yyyyynny 를 치거나 제목을 연달아 8번 누르면 열린다. 관리자님이 좋아하는 노래를 영상과 함께 재생
// 곡에는 목록 순서대로 번호가 붙는다. 열 때는 아무 곡에서 시작하고, 「다음 곡」과 곡이 끝났을 때는 다음 번호로 간다(끝이면 1번으로)
// 곡 목록 [{ v: 영상 ID, s: 시작 초, t: 표시 이름 }] 은 한눈에 읽히지 않게 섞어 둔다(JSON → base64 → 뒤집기). 비밀 보장은 아니다
const LIST = '==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';
export const eggSongs = () => JSON.parse(new TextDecoder().decode(
  Uint8Array.from(atob([...LIST].reverse().join('')), (c) => c.charCodeAt(0))));

const CODE = 'YYYYYNNY'; // 한글 입력 상태에서도 되게 글자가 아니라 눌린 키(e.code)로 본다
const TAPS = 8;          // 제목을 이만큼 연달아 누르면 열린다
const TAP_GAP = 600;     // 연달아로 치는 간격(ms)

// 시트는 data-locked 라 닫기 버튼으로만 닫힌다(제목을 더 눌러도 바깥 클릭으로 닫히지 않게).
// sheet: 이스터에그 dialog, trigger: 제목 요소, open: 시트 여는 함수, onOpen: 열기 직전에 할 일(퀴즈 소리 멈춤)
export function initEgg({ sheet, trigger, open, onOpen }) {
  const songs = eggSongs();
  let yt = null, cur = -1, typed = '', taps = 0, last = 0, fails = 0;
  const $ = (sel) => sheet.querySelector(sel);

  // 목록: 작은 막대를 누르면 펼쳐지고, 곡을 누르면 그 번호로 간다
  const items = songs.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'egg-item';
    b.append(Object.assign(document.createElement('span'), { textContent: i + 1 }), Object.assign(document.createElement('span'), { textContent: s.t }));
    b.addEventListener('click', () => play(i));
    const li = document.createElement('li');
    li.append(b);
    $('#eggList ol').append(li);
    return b;
  });
  $('#eggListBtn').addEventListener('click', () => {
    const on = $('#eggListBtn').getAttribute('aria-expanded') !== 'true';
    $('#eggListBtn').setAttribute('aria-expanded', String(on));
    $('#eggList').classList.toggle('is-open', on);
    $('#eggList').inert = !on; // 접힌 동안에는 초점 · 클릭이 닿지 않게
    if (on) items[cur]?.scrollIntoView({ block: 'nearest' });
  });

  function play(i) {
    if (!window.YT?.Player || (yt && !yt.loadVideoById)) return; // 유튜브 API · 플레이어 준비 전
    cur = (i + songs.length) % songs.length;
    const s = songs[cur];
    $('#eggTitle').textContent = `${cur + 1}. ${s.t}`;
    $('#eggCount').textContent = `${cur + 1} / ${songs.length}`;
    items.forEach((b, k) => { if (k === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    if (yt) { yt.loadVideoById({ videoId: s.v, startSeconds: s.s }); return; }
    yt = new window.YT.Player('eggYt', {
      videoId: s.v,
      playerVars: { start: s.s, autoplay: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: () => { if (!sheet.open) yt.pauseVideo(); }, // 준비되기 전에 닫았으면 닫힌 채로 재생되지 않게
        onStateChange: (e) => { if (e.data === 1) fails = 0; else if (e.data === 0) next(); }, // 끝나면 다음 번호
        // 유튜브가 막은 영상(퍼가기 금지 등)은 건너뛴다. 전부 막혔으면 멈춘다
        onError: () => { if (++fails < songs.length) next(); }
      }
    });
  }
  const next = () => play(cur + 1);
  function show() {
    if (sheet.open) return;
    onOpen();
    open(sheet);
    play(Math.floor(Math.random() * songs.length));
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
  $('#eggNext').addEventListener('click', next);
  sheet.addEventListener('close', () => yt?.pauseVideo?.());
}
