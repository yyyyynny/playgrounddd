// 임시 도구 — 곡별 소리 보정값 수집
// 퀴즈 화면의 8칸 슬라이더로 곡마다 소리 크기를 맞추고, 끝난 뒤 결과(JSON)를 복사·저장해 전달받는다.
// 값이 확정되면 songs.js 의 곡별 값으로 고정하고, 이 파일과 app.js · index.html · style.css 의 보정 관련 부분을 지운다.

export const BASE = 70;   // 가운데(0칸)의 유튜브 볼륨. 100 이 아닌 이유: 위로 올릴 여유(최대 100)를 남겨야 「크게」 칸이 의미가 있다
export const STEP = 7.5;  // 한 칸의 볼륨 변화
export const RANGE = 4;   // ±4칸 (간격 8개 = 8단계)

export const levelOf = (step) => Math.max(0, Math.min(100, Math.round(BASE + step * STEP)));

// adjusted: 슬라이더를 움직여 둔 곡 · kept: 듣고 가운데로 그대로 둔 곡 · unheard: 아직 안 들은 곡
export const statusOf = (step, heard) => (step !== 0 ? 'adjusted' : heard ? 'kept' : 'unheard');

// 이 기기에서 웹이 소리 크기를 바꿀 수 있는지. iPhone 의 WebKit 은 volume 을 설정할 수 없고 읽으면 항상 1 이다(Apple 문서)
export function volumeSettable() {
  try {
    if (typeof Audio === 'undefined') return false;
    const a = new Audio();
    a.volume = 0.5;
    return a.volume === 0.5;
  } catch {
    return false;
  }
}

// ── 저장 (이 기기 localStorage) ──
const KEY = 'music-quiz:gain';
let cache = null;

function data() {
  if (!cache) {
    try { cache = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { cache = {}; }
  }
  return cache;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* 저장 실패는 무시 — 이번 방문 동안은 메모리에 남는다 */ }
}

export const stepOf = (id) => data()[id]?.s ?? 0;

export function setStep(id, step) {
  const d = data();
  d[id] = { s: step, h: 1 }; // 슬라이더를 만졌다는 것은 들었다는 뜻
  save();
}

export function markHeard(id) {
  const d = data();
  if (d[id]?.h) return;
  d[id] = { s: d[id]?.s ?? 0, h: 1 };
  save();
}

export const currentState = () => data();

// ── 결과 ──
// state: { [곡 번호]: { s: 칸 수, h: 들었는지(0|1) } }
export function buildReport(songs, state, meta = {}) {
  return {
    tool: 'music-quiz-volume-calibration',
    date: meta.date || '',
    userAgent: meta.userAgent || '',
    volumeSettable: meta.volumeSettable ?? null,
    note: 'step 0 = 가운데(볼륨 70). 양수 = 더 크게(원래 작게 들려서 올림), 음수 = 더 작게(원래 크게 들려서 내림). 한 칸 = 볼륨 7.5. '
      + 'status: adjusted = 조정함 / kept = 듣고 가운데로 그대로 둠 / unheard = 아직 안 들음 / no-link = 링크 없는 곡(보정 불가)',
    base: BASE,
    stepSize: STEP,
    range: RANGE,
    songs: songs.map((s) => {
      const e = state[s.id] || {};
      const step = s.vid ? e.s ?? 0 : 0;
      return {
        id: s.id,
        meta: s.meta,
        title: s.title,
        step,
        status: s.vid ? statusOf(step, Boolean(e.h)) : 'no-link'
      };
    })
  };
}

export function summarize(report) {
  const n = { adjusted: 0, kept: 0, unheard: 0, 'no-link': 0 };
  for (const s of report.songs) n[s.status]++;
  return n;
}

// 머리 정보는 보기 좋게 펼치고, 곡은 한 줄에 한 곡으로 (사람도 AI 도 읽기 쉬운 JSON)
export function toText(report) {
  const { songs, ...head } = report;
  const rows = songs.map((s) => '    ' + JSON.stringify(s)).join(',\n');
  return JSON.stringify(head, null, 2).replace(/\n}$/, `,\n  "songs": [\n${rows}\n  ]\n}`);
}
