// 곡 데이터 검증 — 곡별 볼륨(gain)이 빠지거나 범위를 벗어나지 않게
import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, GAIN_ON } from '../js/songs.js';

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
