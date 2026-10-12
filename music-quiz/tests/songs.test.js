// 곡 데이터 검증 — 곡별 볼륨(gain)이 빠지거나 범위를 벗어나지 않게
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { SONGS, GAIN_ON, composerGroups, voiceGroups, applyAnswer, cleanRecord, missedSongs, similarGroups } from '../js/songs.js';

test('곡 번호는 1~32 가 겹치지 않고 모두 있다', () => {
  assert.deepEqual(SONGS.map((s) => s.id), Array.from({ length: 32 }, (_, i) => i + 1));
});

test('링크 있는 곡은 gain 이 0~100 정수, 링크 없는 곡은 gain 이 없다', () => {
  for (const s of SONGS) {
    if (s.vid) assert.ok(Number.isInteger(s.gain) && s.gain >= 0 && s.gain <= 100, `${s.id}번 gain: ${s.gain}`);
    else assert.equal(s.gain, undefined, `${s.id}번(링크 없음)에 gain 이 있다`);
  }
});

test('가장 큰 gain 은 100 (보정은 가장 작게 들리는 곡을 100 으로 맞춘 기준)', () => {
  assert.equal(Math.max(...SONGS.filter((s) => s.vid).map((s) => s.gain)), 100);
});

test('곡별 볼륨 스위치(GAIN_ON)는 true/false 이고, 지금은 꺼져 있다(모든 곡 볼륨 100)', () => {
  assert.equal(typeof GAIN_ON, 'boolean');
  assert.equal(GAIN_ON, false); // 켜라는 지시가 있을 때 true 로 바꾸고 이 줄도 함께 바꾼다
});

test('곡 이미지는 번호.webp(영상 있는 곡) · 번호.svg(영상 없는 곡)이고 150KB 이하', () => {
  const dir = new URL('../img/', import.meta.url);
  const want = new Set(SONGS.map((s) => `${String(s.id).padStart(2, '0')}.${s.vid ? 'webp' : 'svg'}`));
  for (const f of readdirSync(dir)) {
    assert.ok(want.has(f), `곡 목록에 없는 이미지: ${f}`);
    assert.ok(statSync(new URL(f, dir)).size <= 150_000, `${f} 가 150KB 를 넘는다`);
  }
});

test('작곡가 모아보기: 곡 많은 작곡가가 먼저, 마지막은 「그 밖」, 32곡이 한 번씩만 들어간다', () => {
  const groups = composerGroups();
  assert.equal(groups[0].label, '모차르트 · 4곡');
  assert.equal(groups.at(-1).label, '그 밖');
  assert.ok(groups.slice(0, -1).every((g) => g.songs.length > 1 && g.songs.every((s) => s.meta === g.songs[0].meta)));
  assert.deepEqual(groups.flatMap((g) => g.songs.map((s) => s.id)).sort((a, b) => a - b), SONGS.map((s) => s.id));
});

test('노래/연주: 32곡이 한 번씩만 들어가고, 영상 없는 곡은 따로 둔다', () => {
  const [sung, played, silent] = voiceGroups();
  assert.equal(sung.songs.length + played.songs.length + silent.songs.length, SONGS.length);
  assert.deepEqual(silent.songs.map((s) => s.id), [27]);
  assert.ok(sung.songs.some((s) => s.id === 13) && played.songs.some((s) => s.id === 9)); // 마왕은 노래, 월광은 연주
});

test('틀린 기록: 틀리면 갚을 횟수가 늘고 맞힐 때마다 1씩 준다, 횟수와 마지막 오답이 남는다', () => {
  let r = applyAnswer(undefined, false, '슈만', '마왕');
  r = applyAnswer(r, false, '슈벨트', '마왕');
  assert.deepEqual(r, { debt: 2, wrong: 2, tried: 2, last: { meta: '슈벨트', title: '마왕' } });
  r = applyAnswer(r, true, '슈베르트', '마왕');
  assert.deepEqual([r.debt, r.wrong, r.tried, r.last.meta], [1, 2, 3, '슈벨트']); // 한 번 맞혀도 아직 남는다
  r = applyAnswer(applyAnswer(r, true), true);
  assert.deepEqual([r.debt, r.wrong, r.tried], [0, 2, 5]);                          // 0 아래로는 안 내려간다
  assert.deepEqual(missedSongs({ 3: { debt: 1 }, 9: { debt: 3 }, 13: { debt: 0 } }).map((s) => s.id), [9, 3]);
});

test('틀린 기록: 깨진 저장값은 버린다', () => {
  const ok = { debt: 1, wrong: 2, tried: 3, last: { meta: 'a', title: 'b' } };
  assert.deepEqual(cleanRecord({ 9: ok, 99: ok, 13: { debt: -1, wrong: 'x', tried: 2 }, 3: 5, 8: { debt: 9, wrong: 1, tried: 1, last: 7 } }),
    { 9: ok, 13: { debt: 0, wrong: 0, tried: 2 }, 8: { debt: 1, wrong: 1, tried: 1 } });
  for (const bad of [null, undefined, 'abc', 7, []]) assert.deepEqual(cleanRecord(bad), {});
});

test('비슷한 곡: 묶음마다 실제 곡이 둘 이상이고 한 묶음 안에서 겹치지 않는다', () => {
  for (const g of similarGroups()) {
    assert.ok(g.songs.length >= 2 && g.songs.every(Boolean), g.label);
    assert.equal(new Set(g.songs.map((s) => s.id)).size, g.songs.length, g.label);
  }
});
