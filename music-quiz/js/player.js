// 유튜브 오디오 재생 — 공식 IFrame Player API, 화면 밖에 숨긴 플레이어 1개를 퀴즈·목록이 공유한다
// 영상·썸네일·제목은 화면에 절대 보이지 않는다 (정답 유출 방지). display:none 은 재생이 멈출 수 있어 쓰지 않는다
//
// 소리 끊김 방지: 재생·탐색 직후에는 음소거 상태로 두었다가 목표 시각에 도착하면 서서히 키운다
// (시작 초가 지정된 곡은 0초 소리가 잠깐 났다가 건너뛰며 '빡' 하는 소리가 났다). 일시정지도 서서히 줄인 뒤 멈춘다

const ERRORS = {
  2: '영상 주소가 올바르지 않습니다',
  5: '이 브라우저에서 재생할 수 없는 영상입니다',
  100: '영상이 삭제되었거나 비공개입니다',
  101: '유튜브가 이 영상의 재생을 막았습니다. 재생 버튼으로 다시 시도해 보세요',
  150: '유튜브가 이 영상의 재생을 막았습니다. 재생 버튼으로 다시 시도해 보세요'
};
const FADE_IN = 450;   // ms
const FADE_OUT = 160;  // ms

let yt = null;          // YT.Player
let ready = false;
let song = null;        // 지금 준비된 곡
let ytState = -1;       // YT.PlayerState
let error = '';
let pausing = false;    // 소리를 줄이는 중 (곧 멈춤)
let gate = null;        // 이 시각에 도착하면 소리를 키운다 { at, since }
let vol = 100;
let fadeRaf = 0;
let gateRaf = 0;
let anchor = { raw: -1, at: 0 }; // 유튜브가 알려 준 마지막 시각과 그때의 시계
let smooth = 0;
const listeners = new Set();

function emit() {
  const s = state();
  listeners.forEach((fn) => fn(s));
}

export function state() {
  const on = (ytState === 1 || ytState === 3) && !pausing;
  return { song, ready, error, playing: on && ytState === 1, buffering: on && ytState === 3 };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── 볼륨 ──
function setVol(v) {
  vol = v;
  yt.setVolume(Math.round(v));
}
function fade(to, ms, done) {
  cancelAnimationFrame(fadeRaf);
  const from = vol;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    setVol(from + (to - from) * k * k * (3 - 2 * k));
    if (k < 1) fadeRaf = requestAnimationFrame(step);
    else { fadeRaf = 0; done?.(); }
  };
  fadeRaf = requestAnimationFrame(step);
}
// 음소거하고 목표 시각을 기다린다
function mute(at) {
  cancelAnimationFrame(fadeRaf);
  fadeRaf = 0;
  pausing = false;
  setVol(0);
  gate = { at, since: performance.now() };
  if (!gateRaf) gateRaf = requestAnimationFrame(watchGate);
}
function watchGate() {
  gateRaf = 0;
  if (!gate) return;
  const t = yt.getCurrentTime() || 0;
  const arrived = ytState === 1 && (t >= gate.at - 0.25 || performance.now() - gate.since > 4000);
  if (arrived) {
    gate = null;
    fade(100, FADE_IN);
    return;
  }
  gateRaf = requestAnimationFrame(watchGate);
}

function resetClock(t) {
  anchor = { raw: -1, at: 0 };
  smooth = t;
}

export function init(hostId) {
  window.onYouTubeIframeAPIReady = () => {
    yt = new window.YT.Player(hostId, {
      width: 200,
      height: 200,
      playerVars: {
        controls: 0, disablekb: 1, playsinline: 1, rel: 0, fs: 0, iv_load_policy: 3,
        origin: location.origin
      },
      events: {
        onReady: () => {
          ready = true;
          const frame = yt.getIframe();
          frame.tabIndex = -1;
          frame.title = '숨겨진 오디오 플레이어';
          if (song?.vid) cue(song);
          emit();
        },
        onStateChange: (e) => { ytState = e.data; emit(); },
        onError: (e) => { error = ERRORS[e.data] || '재생 중 오류가 났습니다'; ytState = -1; emit(); }
      }
    });
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = () => { error = '유튜브에 연결하지 못했습니다'; emit(); };
  document.head.append(tag);
}

function cue(s) {
  ytState = -1;
  gate = null;
  pausing = false;
  resetClock(s.start);
  yt.cueVideoById({ videoId: s.vid, startSeconds: s.start });
}

// 곡 준비 (재생은 하지 않음). 같은 곡이면 그대로 둔다
export function load(s) {
  if (song && s && song.id === s.id && !error) return;
  song = s;
  error = '';
  if (ready && s?.vid) cue(s);
  else ytState = -1;
  emit();
}

// 곡을 바로 재생 (목록의 「듣기」). 클릭 핸들러 안에서 불러야 모바일에서도 소리가 난다
export function play(s) {
  if (!ready || !s?.vid) { load(s); return; }
  if (song && song.id === s.id && !error) {
    if (!state().playing && !state().buffering) toggle();
    return;
  }
  song = s;
  error = '';
  ytState = -1;
  resetClock(s.start);
  mute(s.start);
  yt.loadVideoById({ videoId: s.vid, startSeconds: s.start });
  emit();
}

// 클릭 핸들러 안에서 동기적으로 불러야 iOS 에서도 소리가 난다
export function toggle() {
  if (!ready || !song?.vid) return;
  if (error) { // 오류 뒤 다시 누르면 처음부터 재시도
    const s = song;
    song = null;
    play(s);
    return;
  }
  if ((ytState === 1 || ytState === 3) && !pausing) {
    pause();
    return;
  }
  const t = yt.getCurrentTime() || 0;
  mute(Math.max(t, song.start));
  yt.playVideo();
  emit();
}

export function pause() {
  if (!ready || pausing || !(ytState === 1 || ytState === 3)) return;
  gate = null;
  pausing = true;
  emit();
  fade(0, FADE_OUT, () => {
    if (pausing) yt.pauseVideo();
    pausing = false;
  });
}

export function seek(sec) {
  if (!ready || !song || error) return;
  const to = Math.max(0, sec);
  const wasPaused = ytState === 2 || pausing;
  resetClock(to);
  mute(to);
  yt.seekTo(to, true);
  if (wasPaused) { pausing = false; yt.pauseVideo(); }
}

export function restart() {
  if (!ready || !song || error) return;
  resetClock(song.start);
  mute(song.start);
  yt.seekTo(song.start, true);
  yt.playVideo();
}

// 유튜브가 알려 주는 시각은 띄엄띄엄(초반엔 1초 간격) 바뀐다. 재생 중에는 마지막 값에서 시계로 이어 그린다
export function time() {
  if (!ready || !song?.vid) return { current: 0, duration: 0 };
  const raw = yt.getCurrentTime() || 0;
  const now = performance.now();
  let t = raw;
  if (ytState === 1 && !pausing) {
    if (raw !== anchor.raw) anchor = { raw, at: now };
    t = anchor.raw + Math.min(1.5, (now - anchor.at) / 1000);
    if (t < smooth && smooth - t < 0.6) t = smooth; // 살짝 뒤로 튀는 값은 무시
  } else if (!raw) {
    t = smooth; // 준비 직후 0 이 오면 시작점 유지
  }
  smooth = t;
  return { current: t, duration: yt.getDuration() || 0 };
}
