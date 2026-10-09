// 음악 감상 퀴즈 — 화면 상태와 이벤트
import { SONGS, GROUPS } from './songs.js';
import { isCorrect, charDiff } from './grade.js';
import * as player from './player.js';
import { createWave, formatTime } from './wave.js';

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

function attach(d) {
  deck = d;
  player.load(d.song);
  render(player.state());
}

function render(s) {
  if (!deck) return;
  const hasLink = Boolean(deck.song.vid);
  const mine = s.song && s.song.id === deck.song.id;
  const active = mine && (s.playing || s.buffering);
  setPlayIcon(deck.playBtn, active);
  deck.playBtn.disabled = !hasLink || !s.ready;
  deck.waveEl.setAttribute('aria-disabled', String(deck.playBtn.disabled || Boolean(s.error)));
  deck.wave.setPlaying(mine && s.playing);
  deck.msg.textContent = !hasLink ? '원곡 링크가 없는 곡입니다. 작곡가와 작품명만 맞혀 보세요.'
    : s.error || (s.ready ? '' : '플레이어 준비 중…');
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

const quiz = { queue: [], idx: 0, answered: false, correct: 0, tried: 0 };
const inMeta = $('inMeta');
const inTitle = $('inTitle');

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

function newRound() {
  quiz.queue = shuffle(ALL_IDS.filter((id) => selection.has(id)));
  quiz.idx = 0;
  quiz.correct = 0;
  quiz.tried = 0;
  showQuestion();
}

function showQuestion() {
  const done = quiz.idx >= quiz.queue.length;
  $('quizActive').hidden = done;
  $('quizDone').hidden = !done;
  renderScore();
  if (done) {
    player.pause();
    $('doneScore').textContent = `${quiz.correct} / ${quiz.queue.length}`;
    $('doneSub').textContent = `${quiz.queue.length}곡 중 ${quiz.correct}곡을 맞혔습니다`;
    $('restartAll').focus();
    return;
  }
  const song = byId.get(quiz.queue[quiz.idx]);
  quiz.answered = false;
  $('progress').textContent = `문제 ${quiz.idx + 1} / ${quiz.queue.length}`;
  $('coverNum').textContent = String(quiz.idx + 1).padStart(2, '0');
  inMeta.value = '';
  inTitle.value = '';
  inMeta.disabled = inTitle.disabled = $('submitBtn').disabled = false;
  $('feedback').replaceChildren();
  quizDeck.song = song;
  attach(quizDeck);
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

function resultField(label, answer, input, ok) {
  const head = h('p', { className: 'result-label' }, icon(ok ? 'i-check' : 'i-x'), label);
  if (!ok) head.firstChild.classList.add('is-bad');
  const field = h('div', { className: 'result-field' }, head);
  if (ok) {
    field.append(h('p', { className: 'result-answer' }, answer));
    return field;
  }
  const d = charDiff(answer, input);
  field.append(h('p', { className: 'result-answer' }, marked(d.answer, d.answerOk, 'diff-miss')));
  field.append(h('p', { className: 'result-mine' }, input.trim() ? marked(d.input, d.inputOk, 'diff-wrong') : '(비워 둠)'));
  return field;
}

function submit() {
  if (quiz.answered) return;
  const song = quizDeck.song;
  const meta = inMeta.value;
  const title = inTitle.value;
  const metaOk = isCorrect(song.meta, meta);
  const titleOk = isCorrect(song.title, title);
  const ok = metaOk && titleOk;
  quiz.answered = true;
  quiz.tried++;
  if (ok) quiz.correct++;
  inMeta.disabled = inTitle.disabled = $('submitBtn').disabled = true;

  const next = h('button', { type: 'button', className: 'primary-btn' },
    quiz.idx + 1 < quiz.queue.length ? '다음 곡' : '결과 보기');
  next.addEventListener('click', () => {
    quiz.idx++;
    showQuestion();
    if (!$('quizActive').hidden) $('quizPlay').focus({ preventScroll: true });
  });
  $('feedback').replaceChildren(
    h('div', { className: `result${ok ? ' ok' : ''}` },
      h('p', { className: 'result-badge' }, icon(ok ? 'i-check' : 'i-x'), ok ? '정답입니다' : '아쉬워요, 정답은'),
      resultField('작품명', song.title, title, titleOk),
      resultField('작곡가·시대', song.meta, meta, metaOk)
    ),
    next
  );
  renderScore();
  next.focus({ preventScroll: true });
}

$('answerForm').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
// 앞 칸에서 Enter: 작품명이 비어 있으면 작품명 칸으로 넘어간다
inMeta.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing && !inTitle.value.trim()) {
    e.preventDefault();
    inTitle.focus();
  }
});
$('reshuffle').addEventListener('click', newRound);
$('restartAll').addEventListener('click', newRound);

// ── 시트 공통: 닫기 버튼 · 바깥 클릭 ──
for (const dlg of document.querySelectorAll('dialog')) {
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    const r = dlg.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dlg.close();
  });
}

function songsOf(g) {
  return SONGS.filter((s) => s.id >= g.from && s.id <= g.to);
}
function songText(s) {
  return h('div', { className: 'song-text' },
    h('div', { className: 'song-title' }, s.title),
    h('div', { className: 'song-meta' }, s.meta));
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
  attach(d);
  player.toggle(); // 클릭 안에서 바로 재생해야 모바일에서도 소리가 난다
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
  listSheet.showModal();
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
  $('focusLabel').textContent = selection.size < SONGS.length ? `집중 학습 · ${selection.size}곡` : '집중 학습';
}
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
  focusSheet.showModal();
});
$('focusAll').addEventListener('click', () => { draft = new Set(ALL_IDS); renderFocus(); });
$('focusNone').addEventListener('click', () => { draft = new Set(); renderFocus(); });
$('focusStart').addEventListener('click', () => {
  selection = new Set(draft);
  store.set(KEY_SELECTION, [...selection]);
  updateFocusLabel();
  focusSheet.close();
  newRound();
});

// ── 시작 ──
renderList();
updateFocusLabel();
player.subscribe(render);
player.init('yt');
newRound();
