// 채점 로직 테스트 — 정규화 · 정답 판정 · 괄호 대체 · 글자 단위 diff
import test from 'node:test';
import assert from 'node:assert/strict';
import { isCorrect, charDiff } from '../js/grade.js';
import { SONGS } from '../js/songs.js';

const song = (id) => SONGS.find((s) => s.id === id);
const wrong = (d, side) => d[side].filter((ch, i) => !d[`${side}Ok`][i]).join('');

test('따옴표·공백·온점·대소문자는 쓰지 않아도 된다', () => {
  assert.ok(isCorrect(song(5).title, '오라토리오 메시아 중 할렐루야'));
  assert.ok(isCorrect(song(17).title, '에튀드 OP25 NO11 겨울바람'));
  assert.ok(isCorrect(song(18).title, '대연습곡 S141 no3 라캄파넬라'));
});

test('中 은 중으로 쓰거나 생략해도 되지만 단어 속 중은 그대로', () => {
  assert.ok(isCorrect(song(3).title, '사계 중 봄 1악장'));
  assert.ok(isCorrect(song(3).title, '사계 봄 1악장'));
  assert.ok(isCorrect(song(1).meta, '중세시대'));
  assert.equal(isCorrect(song(1).meta, '세시대'), false);
});

test('괄호는 앞 표현 대신 써도 된다', () => {
  assert.ok(isCorrect(song(2).meta, '르네상스 시대'));
  assert.ok(isCorrect(song(2).meta, '조스캥 데프레'));
  assert.ok(isCorrect(song(8).title, "오페라 '마술피리' 中 밤의 여왕의 아리아"));
  assert.ok(isCorrect(song(8).title, "오페라 '마술피리' 中 지옥의 복수심 내 마음속에 끓어오르고"));
  assert.ok(isCorrect(song(22).meta, '존 칸더'));
  assert.equal(isCorrect(song(8).title, '지옥의 복수심 내 마음속에 끓어오르고'), false);
});

test('전체 일치만 정답이고 부분 입력·빈 입력은 오답', () => {
  assert.equal(isCorrect(song(2).meta, '르네상스'), false);
  assert.equal(isCorrect(song(13).title, '   '), false);
});

test('diff 는 틀린 글자만, 고른 표현 기준으로 표시한다', () => {
  const d = charDiff(song(9).title, '월광소나타 3악장');
  assert.equal(wrong(d, 'answer'), '1');
  assert.equal(wrong(d, 'input'), '3');
  // 대체 표현(조스캥 데프레)으로 답하면 고르지 않은 '르네상스 시대' 는 빨강이 아니다
  const d2 = charDiff(song(2).meta, '조스캥 대프레');
  assert.equal(wrong(d2, 'answer'), '데');
  assert.equal(wrong(d2, 'input'), '대');
});

test('정답을 그대로 입력하면 32곡 모두 정답', () => {
  assert.equal(SONGS.length, 32);
  for (const s of SONGS) assert.ok(isCorrect(s.title, s.title) && isCorrect(s.meta, s.meta), s.title);
});
