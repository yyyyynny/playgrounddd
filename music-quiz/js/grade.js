// 채점 — 화면과 무관한 순수 함수만 둔다 (node:test 로 검증)

// 비교에서 무시하는 글자: 공백 · 따옴표류 · 가운뎃점 · 中(입력하기 어려운 구분자)
const IGNORED = /[\s'"‘’“”`·•・∙中]/u;

const fold = (ch) => ch.toLowerCase();
const isIgnored = (ch) => IGNORED.test(ch);

export function normalize(s) {
  return Array.from((s || '').normalize('NFC')).filter((ch) => !isIgnored(ch)).map(fold).join('');
}

// 전체 일치만 정답 (최고 관리자님 결정). 빈 입력은 오답
export function isCorrect(answer, input) {
  const n = normalize(input);
  return n.length > 0 && n === normalize(answer);
}

// 글자 단위 비교(LCS). 반환: 정답 글자별 / 입력 글자별 맞음 여부
// 무시 글자는 양쪽 모두 맞음(빨강 표시 안 함)으로 취급한다
export function charDiff(answer, input) {
  const a = Array.from((answer || '').normalize('NFC'));
  const b = Array.from((input || '').normalize('NFC'));
  const ai = a.map((ch, i) => i).filter((i) => !isIgnored(a[i]));
  const bi = b.map((ch, i) => i).filter((i) => !isIgnored(b[i]));
  const n = ai.length, m = bi.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = fold(a[ai[i - 1]]) === fold(b[bi[j - 1]])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const answerOk = a.map((ch) => isIgnored(ch));
  const inputOk = b.map((ch) => isIgnored(ch));
  for (let i = n, j = m; i > 0 && j > 0;) {
    if (fold(a[ai[i - 1]]) === fold(b[bi[j - 1]])) {
      answerOk[ai[i - 1]] = true;
      inputOk[bi[j - 1]] = true;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return { answer: a, answerOk, input: b, inputOk };
}
