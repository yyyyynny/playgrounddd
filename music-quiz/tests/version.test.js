// 업데이트 알림 — 마지막으로 본 판 뒤의 것만 알려 주는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION, CHANGELOG, changesSince, versionIn } from '../js/version.js';

test('최신 판이 목록 맨 앞이고, 본 판에 따라 그 뒤의 것만 돌려준다', () => {
  assert.equal(CHANGELOG[0].v, APP_VERSION);
  assert.deepEqual(changesSince(APP_VERSION), []);                              // 이미 최신
  assert.deepEqual(changesSince(CHANGELOG.at(-1).v), CHANGELOG.slice(0, -1));   // 가장 옛 판에서 옴
  assert.deepEqual(changesSince(null), CHANGELOG.slice(0, 1));                  // 처음 방문
  assert.deepEqual(changesSince('없는 판'), CHANGELOG.slice(0, 1));              // 손상된 값
});

test('파일 본문에서 판 번호를 읽는다 — 실제 version.js 에서도, 엉뚱한 본문에서는 null', () => {
  assert.equal(versionIn(readFileSync(new URL('../js/version.js', import.meta.url), 'utf8')), APP_VERSION);
  assert.equal(versionIn("export const APP_VERSION = '2099.01.01-3';"), '2099.01.01-3');
  for (const bad of ['', '<html>404</html>', undefined]) assert.equal(versionIn(bad), null);
});
