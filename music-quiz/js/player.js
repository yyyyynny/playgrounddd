// 유튜브 오디오 재생 — 공식 IFrame Player API, 화면 밖에 숨긴 플레이어 1개를 퀴즈·목록이 공유한다
// 영상·썸네일·제목은 화면에 절대 보이지 않는다 (정답 유출 방지). display:none 은 재생이 멈출 수 있어 쓰지 않는다
//
// 소리 끊김('빡') 방지 규칙
// 1) 소리가 나는 중에 끊는 동작(곡 전환 · 정지 · 탐색 · 일시정지)은 먼저 볼륨을 짧게 줄인 뒤에 한다
// 2) 재생·탐색 직후에는 볼륨 0 으로 두고, 목표 위치에서 재생이 실제로 흐르는 걸 확인한 뒤 서서히 키운다
//    (유튜브는 준비 상태에서 이미 시작 초를 보고하고, 처음 재생 때 0초 소리를 잠깐 낸 뒤 건너뛴다)
// 3) mute()/unMute() 는 쓰지 않는다 — 버퍼링이 긴 곡(108초 시작 등)은 탭 몇 초 뒤에 unMute 가 불려
//    브라우저 자동 재생 정책에 막혀 소리가 안 나는 경우가 있었다. 볼륨 조절은 이 정책의 대상이 아니다

const ERRORS = {
  2: '영상 주소가 올바르지 않습니다',
  5: '이 브라우저에서 재생할 수 없는 영상입니다',
  100: '영상이 삭제되었거나 비공개입니다',
  101: '유튜브가 이 영상의 재생을 막았습니다. 재생 버튼으로 다시 시도해 보세요',
  150: '유튜브가 이 영상의 재생을 막았습니다. 재생 버튼으로 다시 시도해 보세요'
};
const FADE_IN = 600;   // ms
const FADE_OUT = 140;  // ms — 끊기 전에 줄이는 시간
const SETTLE = 280;    // 재생 상태가 된 뒤 최소 대기(ms)
const GIVE_UP = 750;   // 목표 근처인데 시각이 안 바뀌어도 이만큼 재생되면 연다(ms)
const HARD_OPEN = 2500; // 어떤 경우든 이만큼 재생되면 연다(ms) — 소리가 영영 안 나는 일 방지
// 시작 초가 있는 곡은 이만큼 앞에서 굴려 둔다 — 소리가 열리기까지의 묵음이 지정 시작점 근처에서 끝나게
const PRE_ROLL = 0.8;  // 초
const startOf = (s) => (s.start > PRE_ROLL ? s.start - PRE_ROLL : 0);

let yt = null;          // YT.Player
let ready = false;
let song = null;        // 지금 준비된 곡
let ytState = -1;       // YT.PlayerState
let error = '';
let pausing = false;    // 소리를 줄이는 중 (곧 멈춤)
let gate = null;        // 소리를 열 조건 { at, strict, playingSince, firstRaw }
let pending = null;     // 소리를 줄인 뒤 할 일
let vol = 100;
let fadeRaf = 0;
let gateRaf = 0;
// 화면용 시계: 유튜브 시각은 띄엄띄엄·늦게 온다. 자체 시계로 흐르게 하고, 새 값이 오면 오차의 일부만 반영한다
let clock = { t: 0, at: 0, raw: -1, guard: 0 };
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
// 예약된 '줄인 뒤 할 일' 을 지금 바로 한다
function flush() {
  const fn = pending;
  pending = null;
  fn?.();
}
// 소리가 나고 있으면 짧게 줄인 뒤 fn, 아니면 바로 fn
function quietThen(fn) {
  flush();
  gate = null;
  const audible = (ytState === 1 || ytState === 3) && vol > 1;
  if (!audible) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
    setVol(0);
    fn();
    return;
  }
  pending = fn;
  fade(0, FADE_OUT, flush);
}
// 볼륨 0 으로 두고 소리를 열 조건을 건다
// strict: 위치가 건너뛸 수 있는 경우(새 곡 · 탐색) — 시각이 실제로 흐른 걸 확인할 때까지 기다린다
function hold(at, strict = true) {
  cancelAnimationFrame(fadeRaf);
  fadeRaf = 0;
  pausing = false;
  setVol(0);
  gate = { at, strict, playingSince: 0, firstRaw: null };
  if (!gateRaf) gateRaf = requestAnimationFrame(watchGate);
}
function watchGate() {
  gateRaf = 0;
  if (!gate) return;
  const now = performance.now();
  if (ytState !== 1) {
    gate.playingSince = 0;
    gate.firstRaw = null;
  } else {
    const t = yt.getCurrentTime() || 0;
    if (!gate.playingSince) gate.playingSince = now;
    const near = t >= gate.at - 0.3;
    if (near && gate.firstRaw === null) gate.firstRaw = t;
    const played = now - gate.playingSince;
    const advanced = near && gate.firstRaw !== null && t > gate.firstRaw; // 시각이 실제로 흘렀다
    if ((played >= SETTLE && near && (!gate.strict || advanced || played >= GIVE_UP)) || played >= HARD_OPEN) {
      gate = null;
      fade(100, FADE_IN);
      return;
    }
  }
  gateRaf = requestAnimationFrame(watchGate);
}

function resetClock(t) {
  // 탐색 직후 잠깐은 옛 위치 값이 올 수 있어 큰 오차를 무시한다
  clock = { t, at: performance.now(), raw: yt ? yt.getCurrentTime() || 0 : -1, guard: performance.now() + 1500 };
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
  resetClock(startOf(s));
  yt.cueVideoById({ videoId: s.vid, startSeconds: startOf(s) });
}

// 곡 준비 (재생은 하지 않음). 같은 곡이면 그대로 둔다. 링크 없는 곡이면 이전 곡을 멈춘다
export function load(s) {
  if (song && s && song.id === s.id && !error) return;
  song = s;
  error = '';
  if (ready) {
    quietThen(() => {
      if (song !== s) return; // 줄이는 사이 다른 곡으로 바뀜
      if (s?.vid) cue(s);
      else yt.stopVideo();
    });
  }
  ytState = -1;
  pausing = false;
  resetClock(s ? startOf(s) : 0);
  emit();
}

// 곡을 바로 재생 (목록의 「듣기」)
export function play(s) {
  if (!ready || !s?.vid) { load(s); return; }
  if (song && song.id === s.id && !error) {
    if (!state().playing && !state().buffering) toggle();
    return;
  }
  song = s;
  error = '';
  // 다른 곡이 들리는 중이면 줄인 뒤 바꾼다. 조용하면 클릭 안에서 바로 불러 모바일 제약도 피한다
  quietThen(() => {
    if (song !== s) return;
    hold(startOf(s));
    yt.loadVideoById({ videoId: s.vid, startSeconds: startOf(s) });
  });
  ytState = -1;
  pausing = false;
  resetClock(startOf(s));
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
  const wasPausing = pausing;
  flush(); // 곡 전환 등 줄이던 일을 먼저 끝낸다
  if ((ytState === 1 || ytState === 3) && !wasPausing && !pausing) {
    pause();
    return;
  }
  // 처음 재생(준비 상태)은 건너뜀이 생길 수 있어 엄격하게, 일시정지 후 이어 듣기는 바로 연다
  const first = ytState === 5 || ytState === -1;
  hold(first ? startOf(song) : Math.max(0, (yt.getCurrentTime() || 0) - 1), first);
  yt.playVideo();
  emit();
}

export function pause() {
  if (!ready || pausing || !(ytState === 1 || ytState === 3)) return;
  pausing = true;
  emit();
  quietThen(() => {
    yt.pauseVideo();
    pausing = false;
  });
}

export function seek(sec) {
  if (!ready || !song || error) return;
  const to = Math.max(0, sec);
  const wasPaused = ytState === 2 || pausing;
  resetClock(to);
  quietThen(() => {
    hold(to);
    yt.seekTo(to, true);
    if (wasPaused) { pausing = false; yt.pauseVideo(); }
  });
}

export function restart() {
  if (!ready || !song || error) return;
  resetClock(startOf(song));
  quietThen(() => {
    hold(startOf(song));
    yt.seekTo(startOf(song), true);
    yt.playVideo();
  });
}

// 화면에 그릴 재생 시각. 재생 중에는 시계로 흐르고, 유튜브 값이 새로 오면 오차의 20%만 따라간다(되돌아가지 않음)
export function time() {
  if (!ready || !song?.vid) return { current: 0, duration: 0 };
  const raw = yt.getCurrentTime() || 0;
  const now = performance.now();
  const duration = yt.getDuration() || 0;
  if (!(ytState === 1 && !pausing)) {
    // 멈춤 · 버퍼링: 시계를 세우고 유튜브 값에 맞춘다(준비 직후 0 이 오면 기존 값 유지)
    if (raw && now > clock.guard && Math.abs(raw - clock.t) > 1.2) clock.t = raw; // 거친 값으로 살짝 뒤로 튀지 않게
    clock.at = now;
    clock.raw = raw;
    return { current: clock.t, duration };
  }
  const dt = Math.min(0.25, (now - clock.at) / 1000); // 탭이 멈췄다 돌아온 경우 대비
  let t = clock.t + dt;
  if (raw !== clock.raw) {
    const err = raw - t;
    if (Math.abs(err) > 2) { if (now > clock.guard) t = raw; } // 크게 다르면 다른 위치로 간 것
    else t += err * 0.2;
    clock.raw = raw;
  }
  clock.t = Math.max(t, clock.t + dt * 0.5); // 늦게 온 값 때문에 멈추거나 되돌아가지 않게
  clock.at = now;
  return { current: clock.t, duration };
}
