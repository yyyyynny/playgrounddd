// 채점 로직 테스트 — 정규화 · 정답 판정 · 괄호 대체 · 글자 단위 diff
import test from 'node:test';
import assert from 'node:assert/strict';
import { isCorrect, charDiff } from '../js/grade.js';
import { SONGS } from '../js/songs.js';

const song = (id) => SONGS.find((s) => s.id === id);
const wrong = (d, side) => d[side].filter((ch, i) => !d[`${side}Ok`][i]).join('');

test('따옴표·온점·대소문자는 쓰지 않아도 된다', () => {
  assert.ok(isCorrect(song(5).title, '오라토리오 메시아 중 할렐루야'));
  assert.ok(isCorrect(song(17).title, '에튀드 OP25 NO11 겨울바람'));
  assert.ok(isCorrect(song(18).title, '대연습곡 S141 no3 라캄파넬라'));
});

test('中 은 중으로 쓰거나 생략해도 되지만 단어 속 중은 그대로', () => {
  assert.ok(isCorrect(song(3).title, '사계 중 봄 1악장'));
  assert.ok(isCorrect(song(3).title, '사계 봄 1악장'));
  assert.ok(isCorrect(song(26).title, '재즈모음곡중왈츠 2번')); // 붙여 쓴 중
  assert.ok(isCorrect(song(3).title, '사계中봄 1악장'));
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

test('띄어쓰기는 정답과 같아야 한다 — 붙여도 띄어도 오답, 中 둘레만 자유', () => {
  const t12 = song(12).title; // 오페라 ‘세비야의 이발사’ 中 ‘나는 거리의 만물박사’
  assert.ok(isCorrect(t12, '오페라 세비야의 이발사 중 나는 거리의 만물박사'));
  assert.ok(isCorrect(t12, '오페라 세비야의 이발사 나는 거리의 만물박사'));       // 中 생략
  assert.ok(isCorrect(t12, '오페라 세비야의 이발사중나는 거리의 만물박사'));       // 中 붙여 씀
  assert.equal(isCorrect(t12, '오페라 세비야의 이발사 중 나는 거리의 만물 박사'), false); // 없는 자리를 띄움
  assert.equal(isCorrect(t12, '오페라 세비야의이발사 중 나는 거리의 만물박사'), false);  // 있는 자리를 붙임
  assert.equal(isCorrect(t12, '오페라세비야의이발사중나는거리의만물박사'), false);
  assert.ok(isCorrect(song(27).title, '4분 33초'));
  assert.equal(isCorrect(song(27).title, '4분33초'), false);
  // 틀린 띄어쓰기는 그 공백에 표시된다
  const extra = charDiff(t12, '오페라 세비야의 이발사 중 나는 거리의 만물 박사');
  assert.deepEqual([wrong(extra, 'answer'), wrong(extra, 'input')], ['', ' ']);
  const missing = charDiff(song(13).meta + ' 마왕', '슈베르트마왕');
  assert.deepEqual([wrong(missing, 'answer'), wrong(missing, 'input')], [' ', '']);
  // 中 을 빼고 써도 그 둘레 공백은 틀림으로 치지 않는다
  const sepOk = charDiff(song(3).title, '사계 봄 2악장');
  assert.deepEqual([wrong(sepOk, 'answer'), wrong(sepOk, 'input')], ['1', '2']);
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

// 사람이 실제로 칠 법한 형태 — 32곡 모두에 대해
const plain = (str) => str.replace(/中/g, ' 중 ').replace(/[‘’'".]/g, '').replace(/\s+/g, ' ').trim();
function forms(str) {
  const m = str.match(/^(.*?)\(([^)]*)\)$/);
  const x = m ? m[1] : str;
  const out = [str, plain(x), `  ${plain(x).replace(/ /g, '  ')} `, x.replace(/\s*中\s*/g, '중'), x.replace(/\s*中\s*/g, ' ')];
  if (m) {
    const cut = m[1].lastIndexOf('中');
    out.push(plain((cut >= 0 ? m[1].slice(0, cut + 1) + ' ' : '') + m[2]));
  }
  return out;
}

test('32곡 모두: 실사용 입력 변형은 정답, 오타·빈칸은 오답', () => {
  for (const s of SONGS) {
    for (const f of forms(s.meta)) assert.ok(isCorrect(s.meta, f), `${s.id} 작곡가 「${f}」`);
    for (const f of forms(s.title)) assert.ok(isCorrect(s.title, f), `${s.id} 작품명 「${f}」`);
    assert.equal(isCorrect(s.title, s.title.slice(0, -1) + '쀍'), false, `${s.id} 오타`);
    assert.equal(isCorrect(s.title, ''), false);
    const d = charDiff(s.title, s.title.slice(0, -1) + '쀍');
    assert.ok(d.answerOk.some((v) => !v) || d.inputOk.some((v) => !v), `${s.id} 오타 빨강 표시`);
  }
});
