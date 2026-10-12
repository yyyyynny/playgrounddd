// 업데이트 알림 — 마지막으로 본 판 뒤의 것만 알려 주는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_VERSION, CHANGELOG, changesSince } from '../js/version.js';

test('최신 판이 목록 맨 앞이고, 본 판에 따라 그 뒤의 것만 돌려준다', () => {
  assert.equal(CHANGELOG[0].v, APP_VERSION);
  assert.deepEqual(changesSince(APP_VERSION), []);                              // 이미 최신
  assert.deepEqual(changesSince(CHANGELOG.at(-1).v), CHANGELOG.slice(0, -1));   // 가장 옛 판에서 옴
  assert.deepEqual(changesSince(null), CHANGELOG.slice(0, 1));                  // 처음 방문
  assert.deepEqual(changesSince('없는 판'), CHANGELOG.slice(0, 1));              // 손상된 값
});
