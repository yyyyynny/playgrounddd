// 이스터에그 곡 목록 — 섞어 둔 문자열이 제대로 풀리는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { eggSongs } from '../js/egg.js';

test('이스터에그 곡 목록이 풀리고, 곡마다 영상 ID(11자) · 시작 초 · 이름이 있다', () => {
  const songs = eggSongs();
  assert.equal(songs.length, 25);
  for (const s of songs) {
    assert.match(s.v, /^[\w-]{11}$/);
    assert.ok(Number.isInteger(s.s) && s.s >= 0, `시작 초: ${s.s}`);
    assert.ok(s.t.trim());
  }
});
