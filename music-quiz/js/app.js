// 음악 감상 퀴즈 — 화면 상태와 이벤트
import { SONGS, GROUPS } from './songs.js';
import { isCorrect, charDiff } from './grade.js';
import * as player from './player.js';
import { createWave, formatTime } from './wave.js';
import * as cal from './calibration.js';

const $ = (id) => document.getElementById(id);
const byId = new Map(SONGS.map((s) => [s.id, s]));
const ALL_IDS = SONGS.map((s) => s.id);
const SVG_NS = 'http://www.w3.org/2000/svg';

// ── 작은 도우미 ──
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k in el && !k.includes('-')) el[k] = v; else el.setAttribute(k, v);
  }
  el.append(...kids);
  return el;
}
function icon(id) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}
function setPlayIcon(btn, playing) {
  btn.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
  btn.setAttribute('aria-label', playing ? '일시정지' : '재생');
}

// 저장소 접근은 막혀 있을 수 있다(사생활 보호 모드 등) — 실패해도 기본값으로 동작
const store = {
  get(k, fallback) {
    try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 실패는 무시 */ }
  }
};
const KEY_SELECTION = 'music-quiz:selection';
const KEY_THEME = 'music-quiz:theme';

// ── 테마 (기본 라이트) ──
function applyTheme(t) {
  const dark = t === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('themeBtn').setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
  $('themeBtn').querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0f1219' : '#f3f5fa';
}
applyTheme(store.get(KEY_THEME, 'light'));
$('themeBtn').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  store.set(KEY_THEME, next);
  sync(); // 캔버스 색 다시 그리기
});

// ── 재생 조작부(deck) ──
// 플레이어가 하나라 화면에 붙는 조작부도 한 번에 하나(퀴즈 또는 목록의 펼친 행)
let deck = null;
let raf = 0;

function attach(d, autoplay = false) {
  deck = d;
  if (autoplay) player.play(d.song); else player.load(d.song);
  player.setLevel(cal.levelOf(cal.stepOf(d.song.id))); // 곡별 보정 볼륨 (load/play 뒤에 불러야 곡 전환 중인 소리를 건드리지 않는다)
  render(player.state());
}

function render(s) {
  if (!deck) return;
  const hasLink = Boolean(deck.song.vid);
  const mine = s.song && s.song.id === deck.song.id;
  const active = mine && (s.playing || s.buffering);
  if (active) cal.markHeard(deck.song.id); // 재생해 본 곡 표시(보정 결과의 「그대로 둠」 판별용)
  setPlayIcon(deck.playBtn, active);
  deck.playBtn.disabled = !hasLink || !s.ready;
  deck.waveEl.setAttribute('aria-disabled', String(deck.playBtn.disabled || Boolean(s.error)));
  deck.wave.setPlaying(mine && s.playing);
  deck.msg.textContent = !hasLink ? '' : s.error || (s.ready ? '' : '플레이어 준비 중…');
  deck.msg.classList.toggle('is-error', Boolean(s.error));
  deck.onRender?.(active, deck.playBtn.disabled || Boolean(s.error));
  sync();
  if (active && !raf) {
    const step = () => { sync(); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  } else if (!active && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

function sync() {
  if (!deck) return;
  const s = player.state();
  const mine = s.song && s.song.id === deck.song.id && deck.song.vid;
  let { current, duration } = mine ? player.time() : { current: 0, duration: 0 };
  if (!current) current = deck.song.start; // 재생 전에는 지정 시작점을 보여 준다
  deck.wave.setTime(current, duration);
  const c = formatTime(current);
  const d = duration ? formatTime(duration) : '--:--';
  if (deck.cur.textContent !== c) deck.cur.textContent = c;
  if (deck.dur.textContent !== d) deck.dur.textContent = d;
}

function makeDeck({ song, waveEl, playBtn, cur, dur, msg, onRender }) {
  const d = { song, waveEl, playBtn, cur, dur, msg, onRender };
  d.wave = createWave(waveEl, { onSeek: (t) => { if (deck === d) player.seek(t); } });
  playBtn.addEventListener('click', () => { if (deck === d) player.toggle(); });
  return d;
}

// ── 임시 도구: 곡별 소리 보정 (8칸 슬라이더, 가운데 = 기본) ──
const gainRange = $('gainRange');
const canSetVolume = cal.volumeSettable();
$('gainHint').hidden = canSetVolume;
function showStep(step) {
  gainRange.value = String(step);
  $('gainOut').textContent = step === 0 ? '기본' : step > 0 ? `+${step} 크게` : `${step} 작게`;
  gainRange.setAttribute('aria-valuetext', step === 0 ? '가운데(기본)' : step > 0 ? `${step}칸 크게` : `${-step}칸 작게`);
}
gainRange.addEventListener('input', () => {
  const step = Number(gainRange.value);
  showStep(step);
  cal.setStep(quizDeck.song.id, step);
  player.setLevel(cal.levelOf(step));
});

// ── 퀴즈 ──
const quizDeck = makeDeck({
  song: SONGS[0],
  waveEl: $('quizWave'),
  playBtn: $('quizPlay'),
  cur: $('quizCur'),
  dur: $('quizDur'),
  msg: $('quizMsg'),
  onRender(active, disabled) {
    $('cover').classList.toggle('is-playing', active);
    $('quizRestart').disabled = disabled;
    $('quizFwd').disabled = disabled;
  }
});
$('quizRestart').addEventListener('click', () => player.restart());
$('quizFwd').addEventListener('click', () => {
  player.seek((player.time().current || quizDeck.song.start) + 10);
});

let selection = new Set((store.get(KEY_SELECTION, null) || []).filter((id) => byId.has(id)));
if (!selection.size) selection = new Set(ALL_IDS);

// missed: 이번 라운드에서 틀린 곡 · review: 틀린 곡만 다시 푸는 중 · pool: 이번 라운드의 곡 전체(다시 섞기용)
const quiz = { queue: [], idx: 0, answered: false, correct: 0, tried: 0, missed: new Set(), review: false, pool: [] };
const form = $('answerForm');
const inMeta = $('inMeta');
const inTitle = $('inTitle');
const submitBtn = $('submitBtn');

// 제출하면 화살표 버튼이 입력 바를 덮으며 「다음 문제」로 바뀐다
function setAnswered(on) {
  quiz.answered = on;
  form.classList.toggle('is-answered', on);
  inMeta.disabled = inTitle.disabled = on;
  const label = quiz.idx + 1 < quiz.queue.length ? '다음 문제' : '결과 보기';
  $('nextLabel').textContent = label;
  submitBtn.setAttribute('aria-label', on ? label : '제출');
}

// 완료 화면: 지금까지의 보정값(가만히 둔 곡 포함) 전체를 복사·저장할 수 있게 보여 준다
function calibrationText() {
  const report = cal.buildReport(SONGS, cal.currentState(), {
    date: new Date().toLocaleDateString('sv-SE'),
    userAgent: navigator.userAgent,
    volumeSettable: canSetVolume
  });
  return { report, text: cal.toText(report) };
}
function renderCalibration() {
  const { report, text } = calibrationText();
  const n = cal.summarize(report);
  $('calSummary').textContent = `조정 ${n.adjusted}곡 · 그대로 ${n.kept}곡 · 안 들음 ${n.unheard}곡`;
  $('calText').textContent = text;
}
function flash(btn, msg) {
  const old = btn.dataset.label || (btn.dataset.label = btn.textContent);
  btn.textContent = msg;
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.textContent = old; }, 1600);
}
$('calCopy').addEventListener('click', async () => {
  const text = $('calText').textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch { // 클립보드 권한이 없으면 보이는 글자를 선택해 두 번 눌러 복사하게 한다
    const r = document.createRange();
    r.selectNodeContents($('calText'));
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    $('calText').closest('details').open = true;
    flash($('calCopy'), '선택됨 — 길게 눌러 복사');
    return;
  }
  flash($('calCopy'), '복사했습니다');
});
$('calDownload').addEventListener('click', () => {
  const blob = new Blob([$('calText').textContent], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `music-quiz-volume-${new Date().toLocaleDateString('sv-SE')}.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  flash($('calDownload'), '저장했습니다');
});

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderScore() {
  $('score').replaceChildren('맞음 ', h('b', {}, String(quiz.correct)), ' · 시도 ', h('b', {}, String(quiz.tried)));
}

// ids 를 주면 그 곡들만 푸는 복습 라운드, 없으면 집중 학습 선택(기본은 전체) 기준의 새 라운드
function newRound(ids) {
  quiz.review = Array.isArray(ids);
  quiz.pool = quiz.review ? ids : ALL_IDS.filter((id) => selection.has(id));
  quiz.queue = shuffle(quiz.pool);
  quiz.idx = 0;
  quiz.correct = 0;
  quiz.tried = 0;
  quiz.missed = new Set();
  showQuestion();
}

function showQuestion() {
  const done = quiz.idx >= quiz.queue.length;
  $('quizActive').hidden = done;
  $('quizDone').hidden = !done;
  renderScore();
  if (done) {
    player.pause();
    const miss = quiz.missed.size;
    $('doneTitle').textContent = quiz.review ? '복습 완료' : '학습 완료';
    renderCalibration();
    $('doneScore').textContent = `${quiz.correct} / ${quiz.queue.length}`;
    $('doneSub').textContent = miss ? `${quiz.queue.length}곡 중 ${quiz.correct}곡을 맞혔습니다` : '전부 맞혔습니다';
    // 틀린 곡이 있으면 그것만 다시 푸는 버튼이 주(主) 버튼, 전체 다시 풀기는 보조
    $('retryMissed').hidden = miss === 0;
    $('retryMissed').textContent = `틀린 ${miss}곡만 다시 풀기`;
    $('restartAll').classList.toggle('is-secondary', miss > 0);
    $('restartAll').textContent = quiz.review || selection.size < SONGS.length ? '처음부터 다시 풀기' : '다시 섞어서 풀기';
    (miss ? $('retryMissed') : $('restartAll')).focus();
    return;
  }
  const song = byId.get(quiz.queue[quiz.idx]);
  setAnswered(false);
  $('progress').textContent = `${quiz.review ? '복습 · ' : ''}문제 ${quiz.idx + 1} / ${quiz.queue.length}`;
  $('coverNum').textContent = String(quiz.idx + 1).padStart(2, '0');
  inMeta.value = '';
  inTitle.value = '';
  $('feedback').replaceChildren();
  quizDeck.song = song;
  attach(quizDeck);
  showStep(cal.stepOf(song.id));
  gainRange.disabled = !song.vid || !canSetVolume; // 링크 없는 곡 · 볼륨을 못 바꾸는 기기에서는 끔
}

// 글자별 맞음 여부에 따라 틀린 글자만 감싼다 (연속 구간은 하나로 묶음)
function marked(chars, oks, cls) {
  const out = h('span');
  let run = '', runOk = true;
  const flush = () => {
    if (run) out.append(runOk ? run : h('span', { className: cls }, run));
    run = '';
  };
  chars.forEach((ch, i) => {
    if (oks[i] !== runOk) { flush(); runOk = oks[i]; }
    run += ch;
  });
  flush();
  return out;
}

// 정답 쪽: 맞으면 원문 그대로, 틀리면 못 맞힌 글자만 빨강
function answerSpan(answer, input, ok) {
  if (ok) return h('span', {}, answer);
  const d = charDiff(answer, input);
  return marked(d.answer, d.answerOk, 'diff');
}
// 내 답 쪽: 틀린 글자만 빨강
function mineSpan(answer, input, ok) {
  if (!input.trim()) return h('span', { className: 'empty' }, '비움');
  if (ok) return h('span', {}, input.trim());
  const d = charDiff(answer, input);
  return marked(d.input, d.inputOk, 'diff');
}
const sep = () => h('span', { className: 'sep', 'aria-hidden': 'true' }, ' – ');

function submit() {
  if (quiz.answered) return;
  const song = quizDeck.song;
  const meta = inMeta.value;
  const title = inTitle.value;
  const metaOk = isCorrect(song.meta, meta);
  const titleOk = isCorrect(song.title, title);
  const ok = metaOk && titleOk;
  quiz.tried++;
  if (ok) quiz.correct++; else quiz.missed.add(song.id);
  setAnswered(true);
  try { navigator.vibrate?.(ok ? 12 : [14, 60, 14]); } catch { /* 진동 미지원 */ }

  // 입력 순서와 같게 「작곡가 – 작품명」 한 줄로 보여 준다
  $('feedback').replaceChildren(
    h('div', { className: `result ${ok ? 'is-ok' : 'is-ng'}` },
      icon(ok ? 'i-check' : 'i-x'),
      h('div', { className: 'result-text' },
        h('span', { className: 'sr-only' }, ok ? '정답입니다. ' : '오답입니다. 정답은 '),
        h('p', { className: 'result-answer' }, answerSpan(song.meta, meta, metaOk), sep(), answerSpan(song.title, title, titleOk)),
        ok ? '' : h('p', { className: 'result-mine' },
          h('span', { className: 'result-tag' }, '내 답'),
          mineSpan(song.meta, meta, metaOk), sep(), mineSpan(song.title, title, titleOk))
      )
    )
  );
  renderScore();
  submitBtn.focus({ preventScroll: true });
}

function goNext() {
  quiz.idx++;
  showQuestion();
  if (!$('quizActive').hidden) $('quizPlay').focus({ preventScroll: true });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (quiz.answered) goNext(); else submit();
});
// 앞 칸에서 Enter: 작품명이 비어 있으면 작품명 칸으로 넘어간다
inMeta.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing && !inTitle.value.trim()) {
    e.preventDefault();
    inTitle.focus();
  }
});
// 다시 섞기는 지금 라운드의 곡 그대로(복습 중이면 복습 곡만), 처음부터 다시 풀기는 선택 기준 전체
$('reshuffle').addEventListener('click', () => newRound(quiz.review ? quiz.pool : undefined));
$('restartAll').addEventListener('click', () => newRound());
$('retryMissed').addEventListener('click', () => newRound([...quiz.missed]));

// ── 시트: 아래에서 올라와 같은 길로 내려간다. 머리 부분을 끌어 내려 닫을 수 있다 ──
function openSheet(dlg) {
  dlg.classList.remove('is-closing');
  dlg.style.transform = '';
  dlg.showModal();
}
function closeSheet(dlg) {
  if (!dlg.open || dlg.classList.contains('is-closing')) return;
  dlg.style.transition = '';
  dlg.style.transform = '';
  dlg.classList.add('is-closing');
  let timer = 0;
  const done = () => {
    clearTimeout(timer);
    dlg.removeEventListener('transitionend', onEnd);
    dlg.classList.remove('is-closing');
    dlg.close();
  };
  const onEnd = (e) => { if (e.target === dlg && e.propertyName === 'transform') done(); };
  dlg.addEventListener('transitionend', onEnd);
  timer = setTimeout(done, 700); // 전환이 없을 때(동작 줄이기 등) 대비
}
// 경계 밖으로 끌면 점점 덜 따라온다(러버밴드) · 놓을 때 속도로 멈출 위치를 내다본다(Apple 감속 공식)
const rubber = (over, dim) => (over * dim * 0.55) / (dim + 0.55 * over);
const project = (v) => (v / 1000) * 0.998 / (1 - 0.998);

function enableSheetDrag(dlg) {
  const head = dlg.querySelector('.sheet-head');
  let y0 = 0, dy = 0, hist = null;
  head.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || dlg.classList.contains('is-closing')) return;
    head.setPointerCapture(e.pointerId);
    y0 = e.clientY;
    dy = 0;
    hist = [{ y: e.clientY, t: e.timeStamp }];
    dlg.style.transition = 'none';
  });
  head.addEventListener('pointermove', (e) => {
    if (!hist) return;
    const raw = e.clientY - y0;
    dy = raw >= 0 ? raw : -rubber(-raw, dlg.offsetHeight);
    dlg.style.transform = `translateY(${dy}px)`;
    hist.push({ y: e.clientY, t: e.timeStamp });
    if (hist.length > 5) hist.shift();
  });
  const end = () => {
    if (!hist) return;
    const a = hist[0], b = hist[hist.length - 1];
    const v = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0;
    hist = null;
    if (dy + project(v) > dlg.offsetHeight * 0.45) { closeSheet(dlg); return; }
    dlg.style.transition = '';
    dlg.style.transform = ''; // 제자리로 (현재 위치에서 이어서)
  };
  head.addEventListener('pointerup', end);
  head.addEventListener('pointercancel', end);
}

for (const dlg of document.querySelectorAll('dialog')) {
  dlg.querySelector('[data-close]').addEventListener('click', () => closeSheet(dlg));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(dlg); }); // Esc
  dlg.addEventListener('click', (e) => {
    const r = dlg.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeSheet(dlg);
  });
  enableSheetDrag(dlg);
}

function songsOf(g) {
  return SONGS.filter((s) => s.id >= g.from && s.id <= g.to);
}
function songText(s) {
  return h('div', { className: 'song-text' },
    h('div', { className: 'song-meta' }, s.meta),
    h('div', { className: 'song-title' }, s.title));
}

// ── 전체 목록: 「듣기」는 그 자리에서 펼쳐 재생 (외부 이동 없음) ──
const listSheet = $('listSheet');
let inline = null; // 펼친 행 { song, btn, el, deck }

function closeInline() {
  if (!inline) return;
  inline.deck.wave.destroy();
  inline.el.remove();
  inline.btn.setAttribute('aria-expanded', 'false');
  inline = null;
}

function toggleInline(song, item, btn) {
  const same = inline && inline.song.id === song.id;
  closeInline();
  if (same) { player.pause(); return; }

  const waveEl = h('div', { className: 'wave', role: 'slider', tabIndex: 0, 'aria-label': `${song.title} 재생 위치` });
  const playBtn = h('button', { type: 'button', className: 'mini-play', 'aria-label': '재생' }, icon('i-play'));
  const cur = h('span', {}, '0:00');
  const dur = h('span', {}, '--:--');
  const msg = h('p', { className: 'player-msg', role: 'status' });
  const el = h('div', { className: 'inline-player' }, playBtn,
    h('div', { className: 'inline-track' }, waveEl, h('div', { className: 'times' }, cur, dur), msg));
  item.append(el);
  btn.setAttribute('aria-expanded', 'true');

  const d = makeDeck({ song, waveEl, playBtn, cur, dur, msg });
  inline = { song, btn, el, deck: d };
  attach(d, true); // 클릭 안에서 바로 재생해야 모바일에서도 소리가 난다
}

function renderList() {
  const body = $('listBody');
  for (const g of GROUPS) {
    body.append(h('h3', { className: 'group-head' }, g.label));
    for (const s of songsOf(g)) {
      const row = h('div', { className: 'song-row' }, h('span', { className: 'song-num' }, `${s.id}.`), songText(s));
      const item = h('div', { className: 'song' }, row);
      if (s.vid) {
        const btn = h('button', { type: 'button', className: 'listen-btn', 'aria-expanded': 'false' }, icon('i-play'), '듣기');
        btn.addEventListener('click', () => toggleInline(s, item, btn));
        row.append(btn);
      } else {
        row.append(h('span', { className: 'no-link' }, '링크 없음'));
      }
      body.append(item);
    }
  }
}

$('openList').addEventListener('click', () => {
  player.pause();
  openSheet(listSheet);
});
listSheet.addEventListener('close', () => {
  closeInline();
  player.pause();
  // ponytail: 한계 — 목록에서 다른 곡을 들었다면 퀴즈 곡은 시작점부터 다시 준비된다. 위치 유지가 필요하면 load 전에 time() 을 저장해 두었다가 seek
  attach(quizDeck);
});

// ── 집중 학습 ──
const focusSheet = $('focusSheet');
let draft = new Set();

function updateFocusLabel() {
  const on = selection.size < SONGS.length;
  $('focusLabel').textContent = on ? `집중 학습 · ${selection.size}곡` : '집중 학습';
  $('openFocus').classList.toggle('is-on', on);
  $('clearFocus').hidden = !on;
}
// 집중 학습 끄기 → 전체 곡으로 처음부터
$('clearFocus').addEventListener('click', () => {
  selection = new Set(ALL_IDS);
  store.set(KEY_SELECTION, ALL_IDS);
  updateFocusLabel();
  newRound();
  $('openFocus').focus({ preventScroll: true });
});
function updateFocusCount() {
  $('focusCount').textContent = `${draft.size} / ${SONGS.length}곡`;
  $('focusStart').disabled = draft.size === 0;
}
function renderFocus() {
  const body = $('focusBody');
  body.replaceChildren();
  for (const g of GROUPS) {
    body.append(h('h3', { className: 'group-head' }, g.label));
    for (const s of songsOf(g)) {
      const cb = h('input', { type: 'checkbox', checked: draft.has(s.id) });
      cb.addEventListener('change', () => {
        if (cb.checked) draft.add(s.id); else draft.delete(s.id);
        updateFocusCount();
      });
      body.append(h('label', { className: 'check-row' }, cb, h('span', { className: 'song-num' }, `${s.id}.`), songText(s)));
    }
  }
  updateFocusCount();
}

$('openFocus').addEventListener('click', () => {
  draft = new Set(selection);
  renderFocus();
  openSheet(focusSheet);
});
$('focusAll').addEventListener('click', () => { draft = new Set(ALL_IDS); renderFocus(); });
$('focusNone').addEventListener('click', () => { draft = new Set(); renderFocus(); });
$('focusStart').addEventListener('click', () => {
  selection = new Set(draft);
  store.set(KEY_SELECTION, [...selection]);
  updateFocusLabel();
  closeSheet(focusSheet);
  newRound();
});

// ── 새로고침 방지: 풀던 중에 새로고침 · 닫기 · 뒤로 가기를 하면 한 번 묻는다 ──
// (모바일 당겨서 새로고침은 style.css 의 overscroll-behavior 로 막는다)
window.addEventListener('beforeunload', (e) => {
  const inProgress = quiz.tried > 0 && quiz.idx < quiz.queue.length;
  if (!inProgress) return;
  e.preventDefault();
  e.returnValue = ''; // 일부 브라우저는 이 값이 있어야 확인 창을 띄운다
});

// ── 시작 ──
renderList();
updateFocusLabel();
player.subscribe(render);
player.init('yt');
newRound();
