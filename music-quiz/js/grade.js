// 채점 — 화면과 무관한 순수 함수만 둔다 (node:test 로 검증)
//
// 규칙 (최고 관리자님 지정)
// - 전체 일치만 정답. 단 공백 · 따옴표 · 가운뎃점 · 온점 · 쉼표 · 하이픈 · 대소문자는 무시
// - 中 은 '중' 으로 써도 되고 생략해도 된다 (따로 떨어진 '중' 만 해당 — '중세시대' 의 중은 그대로)
// - 'X(Y)' 는 X 대신 Y 를 써도 된다는 뜻. X 는 괄호 앞에서 마지막 中 뒤 부분(없으면 괄호 앞 전체)
//   예) 오페라 ‘마술피리’ 中 밤의 여왕의 아리아(지옥의 복수심…) → 「…中 지옥의 복수심…」 도 정답

const IGNORED = /[\s'"‘’“”`·•・∙.,\-–—()中]/u;
const SPACE = /\s/u;
const fold = (ch) => ch.toLowerCase();

// 글자별 무시 여부. 앞뒤가 공백(또는 끝)인 '중' 도 中 으로 보고 무시한다
function ignoredMask(chars) {
  return chars.map((ch, i) => IGNORED.test(ch) || (ch === '중'
    && (i === 0 || SPACE.test(chars[i - 1]))
    && (i === chars.length - 1 || SPACE.test(chars[i + 1]))));
}

const toChars = (s) => Array.from((s || '').normalize('NFC'));

// 정답으로 인정하는 형태들. 각 형태는 원문 글자 위치 배열로 표현한다(diff 를 원문에 다시 칠하기 위해)
function variants(chars) {
  const all = chars.map((ch, i) => i);
  const open = chars.indexOf('(');
  const close = chars.indexOf(')', open + 1);
  if (open < 0 || close < 0) return [all];
  let xStart = 0;
  for (let i = open - 1; i >= 0; i--) {
    if (chars[i] === '中' || (chars[i] === '중' && SPACE.test(chars[i - 1] || ' ') && SPACE.test(chars[i + 1] || ' '))) {
      xStart = i + 1;
      break;
    }
  }
  const range = (a, b) => all.slice(a, b);
  return [
    range(0, open).concat(range(close + 1)),                                // X
    range(0, xStart).concat(range(open + 1, close), range(close + 1)),     // Y 로 바꿔 쓴 형태
    all                                                                      // X(Y) 그대로
  ];
}

function key(chars, idx, mask) {
  return idx.filter((i) => !mask[i]).map((i) => fold(chars[i])).join('');
}

export function normalize(s) {
  const c = toChars(s);
  const m = ignoredMask(c);
  return key(c, c.map((ch, i) => i), m);
}

// 빈 입력은 오답
export function isCorrect(answer, input) {
  const n = normalize(input);
  if (!n) return false;
  const a = toChars(answer);
  const m = ignoredMask(a);
  return variants(a).some((v) => key(a, v, m) === n);
}

// LCS 로 맞은 글자 위치를 구한다. ai·bi 는 비교할 글자 위치
function lcs(a, ai, b, bi) {
  const n = ai.length, m = bi.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = fold(a[ai[i - 1]]) === fold(b[bi[j - 1]])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const hitA = new Set(), hitB = new Set();
  for (let i = n, j = m; i > 0 && j > 0;) {
    if (fold(a[ai[i - 1]]) === fold(b[bi[j - 1]])) { hitA.add(ai[i - 1]); hitB.add(bi[j - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return { score: dp[n][m], hitA, hitB };
}

// 글자 단위 비교. 입력과 가장 가까운 정답 형태를 골라 원문 위에 맞음/틀림을 칠한다
// 반환: answerOk[i] — 원문 글자가 빨강이 아니면 true (무시 글자 · 고르지 않은 대체 표현 포함)
export function charDiff(answer, input) {
  const a = toChars(answer);
  const b = toChars(input);
  const ma = ignoredMask(a);
  const mb = ignoredMask(b);
  const bi = b.map((ch, i) => i).filter((i) => !mb[i]);
  let best = null;
  for (const v of variants(a)) {
    const ai = v.filter((i) => !ma[i]);
    const r = lcs(a, ai, b, bi);
    // 같은 점수면 더 짧은(빠진 글자가 적은) 형태를 고른다
    if (!best || r.score > best.r.score || (r.score === best.r.score && ai.length < best.len)) {
      best = { r, len: ai.length, used: new Set(v) };
    }
  }
  const answerOk = a.map((ch, i) => ma[i] || !best.used.has(i) || best.r.hitA.has(i));
  const inputOk = b.map((ch, i) => mb[i] || best.r.hitB.has(i));
  return { answer: a, answerOk, input: b, inputOk };
}
