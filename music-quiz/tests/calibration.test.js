// 임시 소리 보정 도구의 순수 로직 테스트 (도구를 지울 때 이 파일도 함께 지운다)
import test from 'node:test';
import assert from 'node:assert/strict';
import { levelOf, statusOf, buildReport, summarize, toText } from '../js/calibration.js';
import { SONGS } from '../js/songs.js';

test('칸 수 → 볼륨: 가운데 70, +4칸 100, -4칸 40, 범위 밖은 0~100 으로 자른다', () => {
  assert.equal(levelOf(0), 70);
  assert.equal(levelOf(4), 100);
  assert.equal(levelOf(-4), 40);
  assert.equal(levelOf(10), 100);
  assert.equal(levelOf(-20), 0);
});

test('상태: 움직임 → adjusted, 들었고 가운데 → kept, 안 들음 → unheard', () => {
  assert.equal(statusOf(2, true), 'adjusted');
  assert.equal(statusOf(-1, false), 'adjusted');
  assert.equal(statusOf(0, true), 'kept');
  assert.equal(statusOf(0, false), 'unheard');
});

test('결과: 32곡 전부 포함, 가만히 둔 곡(kept)도 들어가고, 링크 없는 곡은 no-link', () => {
  const state = { 1: { s: -2, h: 1 }, 2: { s: 0, h: 1 }, 3: { s: 4, h: 1 } };
  const r = buildReport(SONGS, state, { date: '2026-10-10', userAgent: 'x', volumeSettable: true });
  assert.equal(r.songs.length, 32);
  const by = (id) => r.songs.find((s) => s.id === id);
  assert.deepEqual([by(1).step, by(1).status], [-2, 'adjusted']);
  assert.deepEqual([by(2).step, by(2).status], [0, 'kept']);
  assert.deepEqual([by(3).step, by(3).status], [4, 'adjusted']);
  assert.equal(by(4).status, 'unheard');
  assert.equal(by(27).status, 'no-link');
  const n = summarize(r);
  assert.deepEqual([n.adjusted, n.kept, n.unheard, n['no-link']], [2, 1, 28, 1]);
});

test('복사용 텍스트는 올바른 JSON 이고 곡 순서·값이 그대로 돌아온다', () => {
  const state = { 5: { s: 3, h: 1 }, 9: { s: -4, h: 1 } };
  const r = buildReport(SONGS, state, { date: '2026-10-10' });
  const text = toText(r);
  assert.deepEqual(JSON.parse(text), r);
  assert.equal(text.split('\n').filter((l) => l.startsWith('    {')).length, 32); // 곡 하나 = 한 줄
});
