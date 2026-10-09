// 채점 로직 테스트 — 정규화 · 정답 판정 · 글자 단위 diff
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, isCorrect, charDiff } from '../js/grade.js';
import { SONGS } from '../js/songs.js';

test('정규화는 공백·따옴표·가운뎃점·中·대소문자를 무시한다', () => {
  assert.equal(normalize('오라토리오 ‘메시아’ 中 할렐루야'), normalize("오라토리오'메시아'할렐루야"));
  assert.equal(normalize('왈츠 7번 op.64 no.2'), normalize('왈츠7번 OP.64 NO.2'));
  assert.equal(normalize('르네상스 · 조스캥 데프레'), '르네상스조스캥데프레');
});

test('전체 일치만 정답이고 부분 입력·빈 입력은 오답', () => {
  assert.equal(isCorrect('르네상스 · 조스캥 데프레', '르네상스 조스캥 데프레'), true);
  assert.equal(isCorrect('르네상스 · 조스캥 데프레', '조스캥 데프레'), false);
  assert.equal(isCorrect('마왕', '   '), false);
});

test('diff 는 틀린 글자만 표시하고 무시 글자는 맞음으로 둔다', () => {
  const d = charDiff('월광 소나타 1악장', '월광소나타 3악장');
  const wrongInAnswer = d.answer.filter((ch, i) => !d.answerOk[i]).join('');
  const wrongInInput = d.input.filter((ch, i) => !d.inputOk[i]).join('');
  assert.equal(wrongInAnswer, '1');
  assert.equal(wrongInInput, '3');
});

test('정답을 그대로 입력하면 32곡 모두 정답', () => {
  assert.equal(SONGS.length, 32);
  for (const s of SONGS) {
    assert.ok(isCorrect(s.title, s.title) && isCorrect(s.meta, s.meta), s.title);
  }
});
