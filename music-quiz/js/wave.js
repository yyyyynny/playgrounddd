// 물결 진행 막대 — One UI 8.5 미디어 플레이어 방식
// 재생한 구간은 물결로 출렁이고 남은 구간은 직선. 일시정지하면 물결이 잦아들어 직선이 된다
// 드래그 · 클릭 · 방향키(±5초)로 탐색한다

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const LINE = 4;          // 선 굵기(px)
const WAVELENGTH = 26;   // 물결 한 주기(px)
const AMPLITUDE = 3.6;   // 최대 진폭(px)
const SPEED = 5.2;       // 위상 속도(rad/s)
const STEP = 5;          // 방향키 이동(초)

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
export { fmt as formatTime };

function spoken(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}분 ${s}초` : `${s}초`;
}

// el: role="slider" 인 요소(안에 canvas 하나를 만든다), onSeek(초)
export function createWave(el, { onSeek }) {
  const canvas = document.createElement('canvas');
  el.append(canvas);
  const ctx = canvas.getContext('2d');

  let cur = 0, dur = 0;
  let shown = 0;           // 화면에 그리는 위치(0~1). 목표 위치를 부드럽게 따라간다
  let playing = false;
  let amp = 0;             // 0~1, 재생 여부에 따라 부드럽게 변한다
  let phase = 0;
  let drag = null;         // 드래그 중 비율(0~1) 또는 null
  let raf = 0, last = 0, lastSpoken = -1;
  let w = 0, h = 0;

  const ro = new ResizeObserver(() => {
    const dpr = window.devicePixelRatio || 1;
    w = el.clientWidth; h = el.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  });
  ro.observe(el);

  function target() {
    if (drag !== null) return drag;
    return dur > 0 ? Math.min(1, cur / dur) : 0;
  }

  function draw() {
    if (!w || !h) return;
    const css = getComputedStyle(el);
    const played = css.getPropertyValue('--wave-played').trim() || '#3c5bff';
    const rest = css.getPropertyValue('--wave-rest').trim() || '#d7dcea';
    const mid = h / 2;
    const pad = LINE;                     // 양 끝 둥근 꼭지가 잘리지 않게
    const span = w - pad * 2;
    const x = pad + span * shown;
    // 손잡이와 선 사이 틈. 양 끝에서는 틈을 비례로 줄여 선이 손잡이에서 연속으로 자라나게 한다
    // (고정 7px 틈이면 긴 곡 초반 몇 초 동안 선이 없다가 갑자기 생겼다)
    const GAP = 7;
    const gapL = Math.min(GAP, (x - pad) / 2);
    const gapR = Math.min(GAP, (w - pad - x) / 2);

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineWidth = LINE;

    // 남은 구간: 직선
    ctx.strokeStyle = rest;
    ctx.beginPath();
    ctx.moveTo(x + gapR, mid);
    ctx.lineTo(w - pad, mid);
    ctx.stroke();

    // 재생한 구간: 물결. 끝점을 소수점 위치 그대로 이어 1px 단위로 끊기지 않게 한다
    const end = x - gapL;
    const a = AMPLITUDE * amp * Math.min(1, (end - pad) / 48); // 재생 구간이 짧을 땐 물결도 작게
    const yAt = (px) => {
      const taper = Math.min(1, (end - px) / 14, (px - pad) / 6 + 0.4); // 손잡이 쪽은 잦아들게
      return mid + a * Math.max(0, taper) * Math.sin((px / WAVELENGTH) * Math.PI * 2 - phase);
    };
    ctx.strokeStyle = played;
    ctx.beginPath();
    ctx.moveTo(pad, yAt(pad));
    for (let px = pad + 1; px < end; px += 1) ctx.lineTo(px, yAt(px));
    ctx.lineTo(end, yAt(end));
    ctx.stroke();

    // 손잡이: 세로 알약
    ctx.fillStyle = played;
    const tw = 5, th = drag !== null ? 22 : 18;
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, mid - th / 2, tw, th, tw / 2);
    ctx.fill();
  }

  function tick(t) {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    // 진폭·위치 모두 지수 감쇠로 따라간다(겹침 없는 스프링). 진폭은 천천히 피어나고, 위치는 거의 즉시
    const goal = playing ? 1 : 0;
    amp += (goal - amp) * (1 - Math.exp(-dt / 0.28));
    if (Math.abs(goal - amp) < 0.002) amp = goal;
    const to = target();
    shown = drag !== null ? to : shown + (to - shown) * (1 - Math.exp(-dt / 0.08));
    if (Math.abs(to - shown) < 1e-4) shown = to;
    if (!reduceMotion.matches) phase += dt * SPEED * amp;
    draw();
    raf = (playing || amp > 0 || shown !== to) ? requestAnimationFrame(tick) : 0;
    if (!raf) last = 0;
  }

  function animate() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function updateAria() {
    const s = Math.floor(cur);
    if (s === lastSpoken) return;
    lastSpoken = s;
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', String(Math.floor(dur)));
    el.setAttribute('aria-valuenow', String(s));
    el.setAttribute('aria-valuetext', `${spoken(cur)} / ${spoken(dur)}`);
  }

  function ratioAt(e) {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left - LINE) / (r.width - LINE * 2)));
  }

  el.addEventListener('pointerdown', (e) => {
    if (!dur) return;
    el.setPointerCapture(e.pointerId);
    drag = shown = ratioAt(e);
    draw();
  });
  el.addEventListener('pointermove', (e) => {
    if (drag === null) return;
    drag = shown = ratioAt(e);
    draw();
  });
  const finish = (e, commit) => {
    if (drag === null) return;
    const r = commit ? ratioAt(e) : null;
    drag = null;
    if (r !== null) { cur = r * dur; shown = r; onSeek(cur); }
    draw();
  };
  el.addEventListener('pointerup', (e) => finish(e, true));
  el.addEventListener('pointercancel', (e) => finish(e, false));

  el.addEventListener('keydown', (e) => {
    if (!dur) return;
    const to = { ArrowLeft: cur - STEP, ArrowDown: cur - STEP, ArrowRight: cur + STEP, ArrowUp: cur + STEP, Home: 0, End: dur - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    cur = Math.max(0, Math.min(dur, to));
    onSeek(cur);
    animate();
  });

  return {
    setTime(current, duration) {
      if (drag === null) cur = current;
      dur = duration;
      updateAria();
      animate();
    },
    setPlaying(p) {
      playing = p;
      animate();
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.remove();
    }
  };
}
