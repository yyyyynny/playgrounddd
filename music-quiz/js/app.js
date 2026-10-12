// 음악 감상 퀴즈 — 화면 상태와 이벤트
import { SONGS, GROUPS, GAIN_ON, composerGroups, voiceGroups, similarGroups, applyAnswer, cleanRecord, missedSongs } from './songs.js';
import { isCorrect, charDiff } from './grade.js';
import * as player from './player.js';
import { createWave, formatTime } from './wave.js';
import { initEgg } from './egg.js';
import { APP_VERSION, CHANGELOG, changesSince, versionIn } from './version.js';

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
const KEY_LIST_MODE = 'music-quiz:list-mode';
const KEY_RECORD = 'music-quiz:record';
const KEY_SEEN = 'music-quiz:seen-version';

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
  player.setLevel(GAIN_ON ? d.song.gain ?? 100 : 100); // 곡별 볼륨(스위치 GAIN_ON, 지금은 꺼서 모두 100) — load/play 뒤에 불러야 곡 전환 중인 소리를 건드리지 않는다
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
  deck.msg.textContent = !hasLink ? '' : s.error || (!s.ready ? '플레이어 준비 중…' : mine && s.waiting ? `광고가 나오는 중일 수 있어요(${s.waiting}초). 광고 없이 들으려면 유튜브 프리미엄이나 Brave 브라우저를 적극 권장합니다` : '');
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
// 눌림 표시(Apple 방식): 누르는 순간 하이라이트를 켜고, 손을 떼면 끈다(스타일은 .is-pressed).
// 아주 짧게 탭해도 보이도록 최소 표시 시간만 보장하고, 그 뒤에는 CSS 가 부드럽게 꺼 준다.
const MIN_PRESS = 120; // ms
let pressed = null;    // { btn, t }
function releasePress() {
  if (!pressed) return;
  const { btn, t } = pressed;
  pressed = null;
  setTimeout(() => btn.classList.remove('is-pressed'), Math.max(0, MIN_PRESS - (performance.now() - t)));
}
document.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest?.('.icon-btn');
  if (!btn || btn.disabled) return;
  releasePress();
  btn.classList.add('is-pressed');
  pressed = { btn, t: performance.now() };
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) document.addEventListener(ev, releasePress);
window.addEventListener('blur', releasePress);
document.addEventListener('click', (e) => { // 키보드(Enter · Space)로 누른 경우
  const btn = e.detail === 0 && e.target.closest?.('.icon-btn');
  if (!btn || btn.disabled) return;
  btn.classList.add('is-pressed');
  setTimeout(() => btn.classList.remove('is-pressed'), MIN_PRESS + 80);
});

$('coverImg').addEventListener('error', (e) => { e.target.hidden = true; $('cover').disabled = true; });
// 드러난 곡 이미지를 누르면 크게 본다 — 그림이 음반 자리에서 커져 나오고, 닫으면 그 자리로 돌아간다(나온 곳으로 돌아가야 어디서 왔는지 이어진다)
const imgView = $('imgView');
const imgBig = $('imgBig');
let imgHome = null; // 다 커졌을 때의 자리(변형 전 사각형)
let imgFrom = null; // 누른 그림(음반 자리 또는 목록의 썸네일) — 여기서 커져 나오고 여기로 돌아간다
// 큰 그림을 누른 그림 자리에 딱 겹치게 하는 변형. 줄어든 만큼 모서리 둥글기를 키워 그 자리의 둥글기와 맞춘다
function overCover() {
  const c = imgFrom.getBoundingClientRect();
  const k = c.width / imgHome.width;
  imgBig.style.borderRadius = `${parseFloat(getComputedStyle(imgFrom).borderRadius) / k}px`;
  imgBig.style.transform = `translate(${c.left - imgHome.left}px, ${c.top - imgHome.top}px) scale(${k})`;
}
const imgSrc = (s) => `img/${String(s.id).padStart(2, '0')}.${s.vid ? 'webp' : 'svg'}`; // 영상 캡처는 webp, 영상 없는 곡은 svg
function openImg(from, s) {
  imgFrom = from;
  $('imgTitle').textContent = `${s.meta} – ${s.title}`;
  imgBig.src = imgSrc(s);
  imgView.showModal();
  imgBig.style.transition = 'none';
  imgBig.style.transform = imgBig.style.borderRadius = '';
  imgHome = imgBig.getBoundingClientRect();
  overCover();                              // 누른 자리에서 시작해서
  imgFrom.style.visibility = 'hidden';      // (같은 그림이 둘로 보이지 않게)
  void imgBig.offsetWidth;
  imgBig.style.transition = '';
  imgBig.style.transform = imgBig.style.borderRadius = ''; // 제자리로 커진다
  imgView.classList.add('is-in');
}
$('cover').addEventListener('click', () => openImg($('cover'), quizDeck.song));
// 목록 줄에 넣는 작은 곡 이미지 — 누르면 그 자리에서 커진다. 화면에 보일 때 받는다(loading=lazy), 파일이 없으면 자리를 비운다
function thumb(s) {
  const img = h('img', { loading: 'lazy', alt: '', src: imgSrc(s) }); // loading 을 src 보다 먼저 넣어야 미리 받지 않는다
  const btn = h('button', { type: 'button', className: 'thumb', 'aria-label': `${s.title} 이미지 크게 보기` }, img);
  img.addEventListener('error', () => { btn.disabled = true; img.remove(); });
  btn.addEventListener('click', () => openImg(btn, s));
  return btn;
}
function closeImg() {
  if (!imgView.open || !imgView.classList.contains('is-in')) return;
  imgView.classList.remove('is-in');
  overCover(); // 지금 보이는 크기에서 이어서 음반 자리로 줄어든다
  let timer = 0;
  const done = () => {
    clearTimeout(timer);
    imgBig.removeEventListener('transitionend', onEnd);
    imgFrom.style.visibility = '';
    imgView.close();
    if (imgFrom === $('cover')) submitBtn.focus({ preventScroll: true }); // 엔터가 그림을 다시 열지 않고 다음 문제로 가게
  };
  const onEnd = (e) => { if (e.propertyName === 'transform') done(); };
  imgBig.addEventListener('transitionend', onEnd);
  timer = setTimeout(done, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700); // 전환이 없을 때 대비
}
imgView.addEventListener('click', closeImg);
imgView.addEventListener('cancel', (e) => { e.preventDefault(); closeImg(); }); // Esc
$('quizRestart').addEventListener('click', () => player.restart());
$('quizFwd').addEventListener('click', () => {
  player.seek((player.time().current || quizDeck.song.start) + 10);
});

const savedSelection = store.get(KEY_SELECTION, null);
let selection = new Set((Array.isArray(savedSelection) ? savedSelection : []).filter((id) => byId.has(id))); // 깨진 저장값이면 전체 곡으로
if (!selection.size) selection = new Set(ALL_IDS);

// missed: 이번 라운드에서 틀린 곡 · review: 틀린 곡만 다시 푸는 중 · pool: 이번 라운드의 곡 전체(다시 섞기용)
// 틀린 기록(곡마다 갚을 횟수 · 틀린/푼 횟수 · 마지막 오답, 모양은 songs.js) — 「틀린 곡」 창에 쓴다
// 라운드를 다시 시작해도, 새로고침해도 남게 브라우저에 저장한다. 저장이 지워지거나 깨지면 빈 기록으로 조용히 시작한다(cleanRecord)
const record = cleanRecord(store.get(KEY_RECORD, null));
function saveRecord() {
  store.set(KEY_RECORD, record);
  const n = missedSongs(record).length;
  $('missedLabel').textContent = n ? `틀린 곡 · ${n}` : '틀린 곡';
}
// answers: 이번 라운드에서 낸 답(틀린 내역 표시용). 라운드 안에서만 기억한다 — 새로고침하면 라운드가 새로 시작되므로 저장하지 않는다
const quiz = { queue: [], idx: 0, answered: false, correct: 0, tried: 0, missed: new Set(), answers: new Map(), review: false, pool: [] };
const form = $('answerForm');
const inMeta = $('inMeta');
const inTitle = $('inTitle');
const submitBtn = $('submitBtn');

// 제출하면 화살표 버튼이 입력 바를 덮으며 「다음 문제」로 바뀐다
function setAnswered(on) {
  quiz.answered = on;
  form.classList.toggle('is-answered', on);
  $('cover').classList.toggle('is-revealed', on); // 제출하면 숫자 자리에 곡 이미지가 드러난다
  $('cover').disabled = !on || $('coverImg').hidden; // 드러난 동안만 눌러서 크게 볼 수 있다(이미지 파일이 없으면 못 누름)
  inMeta.disabled = inTitle.disabled = on;
  const label = quiz.idx + 1 < quiz.queue.length ? '다음 문제' : '결과 보기';
  $('nextLabel').textContent = label;
  submitBtn.setAttribute('aria-label', on ? label : '제출');
}

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
  quiz.answers = new Map();
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
    $('doneScore').textContent = `${quiz.correct} / ${quiz.queue.length}`;
    $('doneSub').textContent = miss ? `${quiz.queue.length}곡 중 ${quiz.correct}곡을 맞혔습니다` : '전부 맞혔습니다';
    // 틀린 곡이 있으면 그것만 다시 푸는 버튼이 주(主) 버튼, 전체 다시 풀기는 보조
    renderMissed();
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
  // 곡 이미지는 미리 받아 두고 제출 때 보여 준다 — 영상 캡처는 webp, 영상 없는 곡은 svg. 파일이 없으면 숫자 그대로
  $('coverImg').hidden = false;
  $('coverImg').src = imgSrc(song);
  inMeta.value = '';
  inTitle.value = '';
  $('feedback').replaceChildren();
  quizDeck.song = song;
  attach(quizDeck);
}

// 글자별 맞음 여부에 따라 틀린 글자만 감싼다 (연속 구간은 하나로 묶음)
function marked(chars, oks, cls) {
  const out = h('span');
  let run = '', runOk = true;
  const flush = () => {
    if (run) out.append(runOk ? run : h('span', { className: cls }, run.replace(/\s/g, '␣'))); // 틀린 띄어쓰기는 눈에 보이게
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

// 틀린 내역: 전체 목록과 같은 줄 모양에 정답을 쓰고 못 맞힌 글자만 빨강. 내가 쓴 답은 줄마다 접어 둔다(틀린 글자 빨강)
function renderMissed() {
  $('missedBox').hidden = quiz.missed.size === 0;
  $('missedBox').open = false;
  $('missedList').replaceChildren(...quiz.queue.filter((id) => quiz.missed.has(id)).map((id) => {
    const s = byId.get(id);
    const a = quiz.answers.get(id);
    return h('div', { className: 'song' },
      h('div', { className: 'song-row' },
        h('span', { className: 'song-num' }, `${s.id}.`),
        thumb(s),
        h('div', { className: 'song-text' },
          h('div', { className: 'song-meta' }, answerSpan(s.meta, a.meta, a.metaOk)),
          h('div', { className: 'song-title' }, answerSpan(s.title, a.title, a.titleOk)))),
      h('details', { className: 'mine' },
        h('summary', {}, '내가 쓴 답'),
        h('p', {}, mineSpan(s.meta, a.meta, a.metaOk), sep(), mineSpan(s.title, a.title, a.titleOk))));
  }));
}

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
  quiz.answers.set(song.id, { meta, title, metaOk, titleOk });
  record[song.id] = applyAnswer(record[song.id], ok, meta, title);
  saveRecord();
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
  // 영상 없는 곡은 재생 버튼이 꺼져 있어 초점이 「다음 문제」 버튼에 남는다 — 거기서 엔터를 누르면 빈 답이 제출되므로 답 칸으로 보낸다
  if (!$('quizActive').hidden) ($('quizPlay').disabled ? inMeta : $('quizPlay')).focus({ preventScroll: true });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (quiz.answered) goNext(); else submit();
});
// 두 칸이 다 빈 채로 답 칸에서 누른 엔터는 제출하지 않는다(실수로 오답 처리되는 것 방지). 빈 답은 화살표 버튼으로 낸다
form.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('input') && !inMeta.value.trim() && !inTitle.value.trim()) e.preventDefault();
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
  const onEnd = (e) => { if (e.target === dlg && (e.propertyName === 'transform' || e.propertyName === 'opacity')) done(); }; // 동작 줄이기에서는 opacity 만 바뀐다
  dlg.addEventListener('transitionend', onEnd);
  timer = setTimeout(done, 700); // 전환이 없을 때(동작 줄이기 등) 대비
}
// 경계 밖으로 끌면 점점 덜 따라온다(러버밴드) · 놓을 때 속도로 멈출 위치를 내다본다(Apple 감속 공식)
const rubber = (over, dim) => (over * dim * 0.55) / (dim + 0.55 * over);
const project = (v) => (v / 1000) * 0.998 / (1 - 0.998);

// 잠긴 시트(data-locked)는 닫기 버튼으로만 닫힌다 — 바깥 클릭 · Esc · 끌어내리기는 진동과 함께 흔들리고 제자리에 남는다
const isLocked = (dlg) => 'locked' in dlg.dataset;
function refuse(dlg) {
  try { navigator.vibrate?.([14, 60, 14]); } catch { /* 진동 미지원 */ }
  dlg.classList.remove('is-refused');
  void dlg.offsetWidth; // 연달아 눌러도 다시 흔들리게
  dlg.classList.add('is-refused');
}
const dismiss = (dlg) => (isLocked(dlg) ? refuse(dlg) : closeSheet(dlg));

function enableSheetDrag(dlg) {
  const head = dlg.querySelector('.sheet-head');
  const locked = isLocked(dlg);
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
    // 위로는 늘 고무줄, 잠긴 시트는 아래로도 고무줄(끌려 내려가지 않는다)
    dy = raw >= 0 && !locked ? raw : Math.sign(raw) * rubber(Math.abs(raw), dlg.offsetHeight);
    dlg.style.transform = `translateY(${dy}px)`;
    hist.push({ y: e.clientY, t: e.timeStamp });
    if (hist.length > 5) hist.shift();
  });
  const end = () => {
    if (!hist) return;
    const a = hist[0], b = hist[hist.length - 1];
    const v = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0;
    hist = null;
    if (!locked && dy + project(v) > dlg.offsetHeight * 0.45) { closeSheet(dlg); return; }
    if (locked && dy > 8) { try { navigator.vibrate?.([14, 60, 14]); } catch { /* 진동 미지원 */ } }
    dlg.style.transition = '';
    dlg.style.transform = ''; // 제자리로 (현재 위치에서 이어서)
  };
  head.addEventListener('pointerup', end);
  head.addEventListener('pointercancel', end);
}

for (const dlg of document.querySelectorAll('dialog.sheet')) {
  dlg.querySelector('[data-close]').addEventListener('click', () => closeSheet(dlg));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); dismiss(dlg); }); // Esc
  dlg.addEventListener('click', (e) => {
    // 배경(바깥)을 누르면 target 이 dialog 자신이다. 안쪽 버튼을 키보드(Enter · Space)로 누른 클릭은 좌표가 (0,0) 이라
    // 좌표만 보면 바깥으로 잘못 판정돼 시트가 닫혔다(2026-10-13 검사에서 발견)
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dismiss(dlg);
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

// 펼친 재생기는 높이가 0 에서 열리고 같은 길로 접힌다 — 툭 나타나고 툭 사라지면 아래 줄들이 한꺼번에 밀려 어색하다
function closeInline() {
  if (!inline) return;
  const { el, deck: d } = inline;
  inline.btn.setAttribute('aria-expanded', 'false');
  inline = null;
  el.inert = true;
  el.classList.add('is-closing');
  setTimeout(() => { d.wave.destroy(); el.remove(); }, INLINE_CLOSE_MS); // 접힌 뒤에 치운다
}
const INLINE_CLOSE_MS = 360; // style.css 의 --t-mid(320ms)보다 조금 길게

function toggleInline(song, item, btn) {
  const same = inline && inline.btn === btn; // 같은 곡이 여러 묶음에 나올 수 있어 곡이 아니라 누른 줄로 가린다
  closeInline();
  if (same) { player.pause(); return; }

  const waveEl = h('div', { className: 'wave', role: 'slider', tabIndex: 0, 'aria-label': `${song.title} 재생 위치` });
  const playBtn = h('button', { type: 'button', className: 'mini-play', 'aria-label': '재생' }, icon('i-play'));
  const cur = h('span', {}, '0:00');
  const dur = h('span', {}, '--:--');
  const msg = h('p', { className: 'player-msg', role: 'status' });
  const el = h('div', { className: 'inline-wrap' }, h('div', { className: 'inline-clip' },
    h('div', { className: 'inline-player' }, playBtn,
      h('div', { className: 'inline-track' }, waveEl, h('div', { className: 'times' }, cur, dur), msg))));
  item.append(el);
  btn.setAttribute('aria-expanded', 'true');

  const d = makeDeck({ song, waveEl, playBtn, cur, dur, msg });
  inline = { song, btn, el, deck: d };
  attach(d, true); // 클릭 안에서 바로 재생해야 모바일에서도 소리가 난다
}

// 목록 묶는 방식: 번호순(기본) 또는 작곡가 모아보기. 고른 쪽을 기억한다(저장이 지워지면 번호순으로 돌아갈 뿐이다)
const LIST_MODES = {
  number: () => GROUPS.map((x) => ({ label: x.label, songs: songsOf(x) })),
  composer: composerGroups,
  voice: voiceGroups,
  similar: similarGroups
};
let listMode = store.get(KEY_LIST_MODE, 'number');
if (!Object.hasOwn(LIST_MODES, listMode)) listMode = 'number'; // in 은 'toString' 같은 기본 속성 이름도 통과시킨다
$('listModes').addEventListener('click', (e) => {
  const mode = e.target.closest('[data-list-mode]')?.dataset.listMode;
  if (!mode || mode === listMode) return;
  listMode = mode;
  store.set(KEY_LIST_MODE, mode);
  player.pause();
  renderList();
});

function renderList() {
  closeInline();
  const body = $('listBody');
  body.replaceChildren();
  for (const b of $('listModes').querySelectorAll('[data-list-mode]')) {
    const on = b.dataset.listMode === listMode;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('is-on', on);
  }
  const groups = LIST_MODES[listMode]();
  for (const g of groups) {
    // 작곡가 · 노래/연주 묶음은 제목이 곧 정보라 크게 쓴다(이름은 진하게, 곡 수는 옅게). 번호순 묶음은 구분선 구실만 한다
    // 곡 수는 마지막 가운뎃점 뒤에 있다(「합창 · 종교 음악 · 4곡」처럼 이름에도 가운뎃점이 올 수 있다)
    const cut = /곡$/.test(g.label) ? g.label.lastIndexOf(' · ') : -1;
    const [name, count] = cut < 0 ? [g.label, ''] : [g.label.slice(0, cut), g.label.slice(cut + 3)];
    body.append(listMode === 'number'
      ? h('h3', { className: 'group-head' }, g.label)
      : h('h3', { className: 'group-head is-strong' }, name, count ? h('span', {}, count) : ''));
    // 제목이 작곡가 이름인 묶음에서는 줄마다 되풀이되는 작곡가 줄을 뺀다
    const sameMeta = listMode === 'composer' && g.songs.length > 1 && g.songs.every((s) => s.meta === g.songs[0].meta);
    for (const s of g.songs) {
      const row = h('div', { className: 'song-row' }, h('span', { className: 'song-num' }, `${s.id}.`), thumb(s), songText(s));
      const item = h('div', { className: sameMeta ? 'song same-meta' : 'song' }, row);
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
  renderList(); // 틀린 기록이 바뀌었을 수 있다
  openSheet(listSheet);
});
listSheet.addEventListener('close', () => {
  closeInline();
  player.pause();
  // ponytail: 한계 — 목록에서 다른 곡을 들었다면 퀴즈 곡은 시작점부터 다시 준비된다. 위치 유지가 필요하면 load 전에 time() 을 저장해 두었다가 seek
  attach(quizDeck);
});

// ── 틀린 곡: 갚을 횟수가 남은 곡을 모아 보고, 다시 듣고, 그 곡들로만 풀 수 있다 ──
const missedSheet = $('missedSheet');
function renderMissedSheet() {
  closeInline();
  const songs = missedSongs(record);
  $('missedFoot').hidden = songs.length === 0;
  $('missedBody').replaceChildren(
    h('p', { className: songs.length ? 'list-hint' : 'list-empty' }, songs.length
      ? '틀리면 남은 횟수가 1 늘고, 맞히면 1 줄어요. 0이 되면 여기서 빠져요.'
      : '아직 틀린 곡이 없어요. 문제를 틀리면 여기에 모여요.'),
    ...songs.map((s) => {
      const r = record[s.id];
      // 마지막 오답이 있으면 정답 줄에 못 맞힌 글자 · 띄어쓰기를 표시한다(빠뜨린 글자나 붙여 쓴 자리는 내 답 쪽에 표시가 없다)
      const text = !r.last ? songText(s) : h('div', { className: 'song-text' },
        h('div', { className: 'song-meta' }, answerSpan(s.meta, r.last.meta, isCorrect(s.meta, r.last.meta))),
        h('div', { className: 'song-title' }, answerSpan(s.title, r.last.title, isCorrect(s.title, r.last.title))));
      const row = h('div', { className: 'song-row' }, h('span', { className: 'song-num' }, `${s.id}.`), thumb(s), text);
      const item = h('div', { className: 'song' }, row);
      if (s.vid) {
        const btn = h('button', { type: 'button', className: 'listen-btn', 'aria-expanded': 'false' }, icon('i-play'), '듣기');
        btn.addEventListener('click', () => toggleInline(s, item, btn));
        row.append(btn);
      }
      const del = h('button', { type: 'button', className: 'icon-btn', 'aria-label': `${s.title} 기록 지우기` }, icon('i-close'));
      del.addEventListener('click', () => { delete record[s.id]; saveRecord(); player.pause(); renderMissedSheet(); });
      row.append(del);
      item.append(h('p', { className: 'miss-stat' }, h('strong', {}, `${r.debt}번 남음`), ` · ${r.tried}번 중 ${r.wrong}번 틀림`));
      if (r.last) {
        const metaOk = isCorrect(s.meta, r.last.meta), titleOk = isCorrect(s.title, r.last.title);
        item.append(h('details', { className: 'mine' }, h('summary', {}, '마지막으로 쓴 오답'),
          h('p', {}, mineSpan(s.meta, r.last.meta, metaOk), sep(), mineSpan(s.title, r.last.title, titleOk))));
      }
      return item;
    }));
}
$('openMissed').addEventListener('click', () => {
  player.pause();
  renderMissedSheet();
  openSheet(missedSheet);
});
missedSheet.addEventListener('close', () => {
  closeInline();
  player.pause();
  attach(quizDeck);
});
$('missedStart').addEventListener('click', () => {
  const ids = missedSongs(record).map((s) => s.id);
  closeSheet(missedSheet);
  newRound(ids);
});
$('missedClear').addEventListener('click', () => {
  if (!confirm('틀린 기록을 모두 지울까요? 되돌릴 수 없어요.')) return;
  for (const id of Object.keys(record)) delete record[id];
  saveRecord();
  renderMissedSheet();
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

// ── 업데이트 알림: 새 판이면 그 사이 바뀐 것을 한 번 띄운다. 종 버튼은 전체 내역 (내용은 js/version.js) ──
function showNews(entries, title) {
  $('newsTitle').textContent = title;
  $('newsAll').hidden = entries.length === CHANGELOG.length; // 일부만 보여 줄 때만 「전체 내역 보기」
  $('newsBody').replaceChildren(...entries.flatMap((c) => [
    h('h3', { className: 'group-head' }, c.v),
    h('ul', { className: 'news-list' }, ...c.lines.map((l) => h('li', {}, l)))
  ]));
  openSheet($('newsSheet'));
}
$('openNews').addEventListener('click', () => showNews(CHANGELOG, '업데이트 내역'));
$('newsAll').addEventListener('click', () => { showNews(CHANGELOG, '업데이트 내역'); $('newsBody').scrollTop = 0; });

// ── 열어 둔 탭에서도 새 판 알아채기: 탭으로 돌아올 때와 3분마다 서버의 version.js 를 확인하고, 판이 다르면 알림 막대를 띄운다 ──
// 풀던 중에 화면이 저절로 바뀌면 안 되므로 새로고침은 누를 때만 한다
const VERSION_CHECK_GAP = 60000; // 확인 간격(ms) — 탭을 자주 오가도 요청은 1분에 한 번
// ponytail: 한계 — 새로고침 전에 다시 받아 둘 파일을 손으로 적어 둔다(브라우저가 옛 파일을 계속 쓰지 않게). 파일을 더하면 여기도 더한다
const APP_FILES = ['./', 'style.css', 'js/app.js', 'js/songs.js', 'js/grade.js', 'js/player.js', 'js/wave.js', 'js/egg.js', 'js/version.js'];
let lastVersionCheck = performance.now(); // 막 연 직후에는 확인하지 않는다
let dismissedVersion = null;
async function checkNewVersion() {
  if (document.visibilityState !== 'visible' || performance.now() - lastVersionCheck < VERSION_CHECK_GAP) return;
  lastVersionCheck = performance.now();
  try {
    const latest = versionIn(await (await fetch('js/version.js', { cache: 'no-store' })).text());
    if (latest && latest !== APP_VERSION && latest !== dismissedVersion) {
      $('updateBar').dataset.version = latest;
      $('updateBar').hidden = false;
    }
  } catch { /* 오프라인 등 — 다음에 다시 본다 */ }
}
document.addEventListener('visibilitychange', checkNewVersion);
window.addEventListener('focus', checkNewVersion);
setInterval(checkNewVersion, 180000); // 탭을 켜 둔 채 가만히 있어도 3분마다 본다(화면에 보일 때만)
$('updateDismiss').addEventListener('click', () => {
  dismissedVersion = $('updateBar').dataset.version; // 이 판은 다시 묻지 않는다(더 새 판이 나오면 다시 뜬다)
  $('updateBar').hidden = true;
});
$('updateReload').addEventListener('click', async () => {
  $('updateReload').disabled = true;
  await Promise.all(APP_FILES.map((f) => fetch(f, { cache: 'reload' }).catch(() => {})));
  location.reload();
  $('updateReload').disabled = false; // 풀던 중이라 떠나기 확인에서 취소한 경우 다시 누를 수 있게
});

// ── 키보드: 마우스 없이 풀기 ──
// 스페이스 = 재생·일시정지, 엔터 = 제출·다음 문제(답 칸 · 버튼 위에서는 브라우저 기본 동작이 이미 그렇게 한다)
document.addEventListener('keydown', (e) => {
  if (e.isComposing || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('dialog[open]') || $('quizActive').hidden) return;
  const el = e.target;
  if (e.code === 'Space') {
    // 버튼 위에서는 기본 동작에 맡긴다. 답 칸에서는 비어 있을 때만 — 글자 사이 띄어쓰기는 그대로 입력돼야 한다
    // ponytail: 한계 — 답을 치는 중에는 스페이스로 멈출 수 없다(Tab 으로 재생 버튼에 가서 누른다). 필요하면 전용 단축키 추가
    if (el.matches('button') || (el.matches('input') && el.value)) return;
    e.preventDefault();
    $('quizPlay').click();
  } else if (e.key === 'Enter' && el === document.body) {
    // 아무 데도 초점이 없을 때: 채점이 끝났으면 다음 문제, 아니면 빈 답이 제출되지 않게 답 칸으로만 간다
    e.preventDefault();
    if (quiz.answered) goNext(); else focusAnswer();
  }
});
// 재생을 시작하면 바로 답을 칠 수 있게 빈 칸으로 간다
function focusAnswer() {
  (inMeta.value.trim() && !inTitle.value.trim() ? inTitle : inMeta).focus({ preventScroll: true });
}
$('quizPlay').addEventListener('click', () => {
  const s = player.state();
  if (!quiz.answered && (s.playing || s.buffering)) focusAnswer();
});

// ── 새로고침 방지: 풀던 중에 새로고침 · 닫기 · 뒤로 가기를 하면 한 번 묻는다 ──
// (모바일 당겨서 새로고침은 style.css 의 overscroll-behavior 로 막는다)
window.addEventListener('beforeunload', (e) => {
  const inProgress = quiz.tried > 0 && quiz.idx < quiz.queue.length;
  if (!inProgress) return;
  e.preventDefault();
  e.returnValue = ''; // 일부 브라우저는 이 값이 있어야 확인 창을 띄운다
});

// ── 실제로 보이는 화면 크기(px)를 CSS 변수(--app-w · --app-h)로 둔다 — ence 저장소 setupViewportVars 를 줄여 옮김 ──
// 모바일 주소창 때문에 vh 가 실제와 어긋나고, 화면을 돌리면 값이 여러 번 바뀐다. 150ms 잠잠해진 뒤 한 번만 반영한다
function trackViewport() {
  let timer = 0;
  const apply = () => {
    const vv = window.visualViewport;
    if (vv && vv.scale > 1.001) return; // 핀치 확대 중에는 보이는 영역만 좁아진 것, 화면 크기가 바뀐 게 아니다
    const root = document.documentElement.style;
    root.setProperty('--app-w', `${Math.round(vv ? vv.width : innerWidth)}px`);
    root.setProperty('--app-h', `${Math.round(vv ? vv.height : innerHeight)}px`);
  };
  const update = () => { clearTimeout(timer); timer = setTimeout(apply, 150); };
  apply();
  addEventListener('resize', update);
  addEventListener('orientationchange', update);
  window.visualViewport?.addEventListener('resize', update);
}

// ── 시작 ──
saveRecord(); // 틀린 곡 수 표시
trackViewport();
renderList();
updateFocusLabel();
player.subscribe(render);
player.init('yt');
initEgg({ sheet: $('eggSheet'), trigger: document.querySelector('.brand'), open: openSheet, onOpen: () => player.pause() });
newRound();
{
  const news = changesSince(store.get(KEY_SEEN, null));
  store.set(KEY_SEEN, APP_VERSION);
  if (news.length) showNews(news, '새로 바뀐 것');
}
