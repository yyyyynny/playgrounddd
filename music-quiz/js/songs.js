// 음악 감상 목록 32곡 — 최고 관리자님이 처음 전달받은 원본 목록 표기 그대로 (Notion 은 링크·시작 초 대조용)
// meta: 작곡가·시대, title: 작품명, vid: 유튜브 영상 ID(없으면 링크 없음), start: 시작 초
// gain: 곡별 볼륨(0~100) — 2026-10-11 관리자님 보정값(갤럭시, 폰 볼륨 고정, 곡 처음 10~20초 기준)을 70 + 7.5 × (칸 + 1) 로 환산. 같은 날 요청으로 전체를 1칸(7.5) 올렸고, 100 을 넘는 곡은 100 으로 잘렸다. 링크 없는 곡은 없음
// 'X(Y)' 는 X 대신 Y 를 써도 정답 (grade.js 참조)
export const SONGS = [
  { id: 1, meta: '중세시대', title: '성요한 찬가', vid: '3iR3bJKk1Xc', start: 0, gain: 85 },
  { id: 2, meta: '르네상스 시대(조스캥 데프레)', title: '아베마리아', vid: 'FNbIyFlvxlk', start: 3, gain: 85 },
  { id: 3, meta: '비발디', title: '사계 中 봄 1악장', vid: 'ZcvufxsthGs', start: 10, gain: 78 },
  { id: 4, meta: '바흐', title: '토카타와 푸가 라단조', vid: 'Nnuq9PXbywA', start: 0, gain: 78 },
  { id: 5, meta: '헨델', title: '오라토리오 ‘메시아’ 중 ‘할렐루야’', vid: 'u6_nJ11BgTE', start: 2, gain: 93 },
  { id: 6, meta: '하이든', title: '트럼펫 협주곡 3악장', vid: '58vkAIlm8z0', start: 0, gain: 85 },
  { id: 7, meta: '모차르트', title: '레퀴엠 중 라크리모사', vid: 'VixAWkjyhx0', start: 0, gain: 85 },
  { id: 8, meta: '모차르트', title: '오페라 ‘마술피리’ 中 밤의 여왕의 아리아(지옥의 복수심 내 마음속에 끓어오르고)', vid: 's7vJcUogrEI', start: 11, gain: 78 },
  { id: 9, meta: '베토벤', title: '월광소나타 1악장', vid: '28lA52yQvwk', start: 7, gain: 100 },
  { id: 10, meta: '베토벤', title: '비창소나타 3악장', vid: 'DNouyWhngck', start: 7, gain: 85 },
  { id: 11, meta: '베토벤', title: '교향곡 5번 운명', vid: 'NWWbA5H5pEs', start: 7, gain: 100 },
  { id: 12, meta: '로시니', title: '오페라 ‘세비야의 이발사’ 中 ‘나는 거리의 만물박사’', vid: 'qovJV2cSr6I', start: 18, gain: 85 },
  { id: 13, meta: '슈베르트', title: '마왕', vid: 'GGelWMD8PtQ', start: 0, gain: 70 },
  { id: 14, meta: '드뷔시', title: '달빛', vid: '97_VJve7UVc', start: 0, gain: 100 },
  { id: 15, meta: '라벨', title: '볼레로', vid: 'f4iMjjnXbT4', start: 0, gain: 78 },
  { id: 16, meta: '쇼팽', title: '왈츠 7번 op.64 no.2', vid: 'cSmU9qu-tKM', start: 0, gain: 78 },
  { id: 17, meta: '쇼팽', title: '에튀드 op.25 no.11 ‘겨울바람’', vid: '60Upg8Hz0rI', start: 0, gain: 93 },
  { id: 18, meta: '리스트', title: '대연습곡 S.141. no.3 ‘라캄파넬라’', vid: 'Hf2MFBz4S_g', start: 0, gain: 78 },
  { id: 19, meta: '슈트라우스', title: '차라투스트라는 이렇게 말했다.', vid: 'o-lzzuEVSMY', start: 0, gain: 70 },
  { id: 20, meta: '슈톡하우젠', title: '습작2', vid: 'y5Kh6c8GMCA', start: 6, gain: 78 },
  { id: 21, meta: '비제', title: '카르멘 서곡', vid: 'WRddSpJjx40', start: 0, gain: 63 },
  { id: 22, meta: '존 캔더(존 칸더)', title: '뉴욕뉴욕', vid: 'LOFxFNV5DBQ', start: 12, gain: 78 },
  { id: 23, meta: '키무라 유미', title: '언제나 몇 번이라도', vid: 'mHZU4O_r6R8', start: 0, gain: 70 },
  { id: 24, meta: '하지영', title: '여행을 떠나요', vid: 'muSCAQpiebs', start: 0, gain: 70 },
  { id: 25, meta: '에릭 사티', title: '짐노페디 1번', vid: 'M9XPfymOx3Q', start: 0, gain: 93 },
  { id: 26, meta: '쇼스타코비치', title: '재즈모음곡 중 왈츠 2번', vid: 'gYSRrer6iO8', start: 0, gain: 78 },
  // 원본은 '4:33'. Notion 표기 '4분 33초' 도 정답으로 받으려고 괄호 대체로 둔다
  { id: 27, meta: '존 케이지', title: '4:33(4분 33초)', vid: '', start: 0 },
  { id: 28, meta: '쇤베르크', title: '달에 홀린 피에로 8번 밤', vid: 'Y2-1H9yhU2A', start: 0, gain: 100 },
  { id: 29, meta: '로시니', title: '오페라 ‘세비야의 이발사’ 中 ‘방금 들린 그대 음성’', vid: 'pqwnxEf-2KY', start: 108, gain: 85 },
  { id: 30, meta: '모차르트', title: '오페라 ‘피가로의 결혼’ 中 ‘더 이상 날지 못하리 나비야’', vid: 'MXXzaogIn_I', start: 2, gain: 93 },
  { id: 31, meta: '모차르트', title: '오페라 ‘피가로의 결혼’ 中 ‘편지 이중창’', vid: 'un7tf_iCGPA', start: 0, gain: 78 },
  { id: 32, meta: '이병우', title: '영화 장화홍련 中 돌이킬 수 없는 걸음', vid: 'oeLHy3dIiXs', start: 0, gain: 93 }
];

// 곡별 볼륨(gain) 사용 스위치 — 지금은 꺼 둠(모든 곡 볼륨 100). 위의 gain 값은 그대로 보관 중이고,
// 관리자님이 「켜」라고 하시면 true 로 바꾸기만 하면 된다 (2026-10-11 관리자님 지시)
export const GAIN_ON = false;

// 전체 목록 묶음 — Notion 페이지의 소제목과 같다
export const GROUPS = [
  { label: '1 – 10', from: 1, to: 10 },
  { label: '11 – 20', from: 11, to: 20 },
  { label: '21 – 32', from: 21, to: 32 }
];

// 작곡가 모아보기 묶음 — 두 곡 이상인 작곡가를 곡 많은 순으로(같으면 번호 빠른 순), 한 곡뿐인 작곡가는 「그 밖」에 번호순
export function composerGroups() {
  const by = new Map();
  for (const s of SONGS) by.set(s.meta, [...(by.get(s.meta) || []), s]);
  const multi = [...by.values()].filter((l) => l.length > 1).sort((a, b) => b.length - a.length);
  return [
    ...multi.map((songs) => ({ label: `${songs[0].meta} · ${songs.length}곡`, songs })),
    { label: '그 밖', songs: SONGS.filter((s) => by.get(s.meta).length === 1) }
  ];
}

// 노래(사람 목소리가 있는 곡) — 퀴즈에 쓰는 영상 기준. 22번 뉴욕뉴욕은 금관 합주 영상이라 연주, 27번 4:33 은 소리가 없어 어느 쪽도 아니다
const VOCAL = new Set([1, 2, 5, 7, 8, 12, 13, 23, 24, 28, 29, 30, 31]);
export function voiceGroups() {
  const sung = SONGS.filter((s) => VOCAL.has(s.id));
  const played = SONGS.filter((s) => s.vid && !VOCAL.has(s.id));
  return [
    { label: `노래 · ${sung.length}곡`, songs: sung },
    { label: `연주 · ${played.length}곡`, songs: played },
    { label: '소리 없음', songs: SONGS.filter((s) => !s.vid) }
  ];
}

// ── 틀린 기록 ── 곡마다 { debt, wrong, tried, last }
// debt: 아직 갚을 횟수 — 틀리면 +1, 맞히면 -1. 0 보다 크면 「틀린 곡」에 나온다(2번 틀렸으면 2번 맞혀야 빠진다)
// wrong / tried: 지금까지 틀린 횟수 / 푼 횟수.  last: 마지막으로 틀렸을 때 쓴 답 { meta, title }
const count = (v) => (Number.isInteger(v) && v > 0 ? v : 0);

// 답 하나를 기록에 반영한 새 항목을 돌려준다
export function applyAnswer(rec, ok, meta, title) {
  const r = rec || { debt: 0, wrong: 0, tried: 0 };
  return ok
    ? { ...r, tried: r.tried + 1, debt: Math.max(0, r.debt - 1) }
    : { debt: r.debt + 1, wrong: r.wrong + 1, tried: r.tried + 1, last: { meta, title } };
}

// 저장해 둔 기록을 믿을 수 있는 값만 남겨 되살린다 — 깨졌거나 다른 모양이면 그 곡(또는 전체)을 빈 기록으로(오류를 내지 않는다)
export function cleanRecord(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const s of SONGS) {
    const r = raw[s.id];
    if (!r || typeof r !== 'object' || !count(r.tried)) continue;
    const wrong = Math.min(count(r.wrong), r.tried);
    out[s.id] = { debt: Math.min(count(r.debt), wrong), wrong, tried: r.tried };
    if (typeof r.last?.meta === 'string' && typeof r.last?.title === 'string') out[s.id].last = { meta: r.last.meta, title: r.last.title };
  }
  return out;
}

// 「틀린 곡」에 나올 곡 — 갚을 횟수가 많은 순(같으면 번호순)
export const missedSongs = (record) => SONGS.filter((s) => record[s.id]?.debt > 0).sort((a, b) => record[b.id].debt - record[a.id].debt);

// 비슷한 곡 모아보기 — 서로 헷갈리기 쉬운 곡끼리(이름 · 갈래 · 소리). 한 곡이 여러 묶음에 들어갈 수 있다
// 2026-10-13 관리자님 예시(슈톡하우젠·슈트라우스, 피가로·세비야, 왈츠, 리스트·쇼팽, 운명·토카타)를 바탕으로 Claude 가 나눔 — 고치려면 번호만 바꾼다
const SIMILAR = [
  ['이름이 비슷한 작곡가', [28, 26, 16, 17, 13, 20, 19]], // 쇤베르크 · 쇼스타코비치 · 쇼팽 · 슈베르트 · 슈톡하우젠 · 슈트라우스
  ['오페라', [8, 30, 31, 12, 29]],                        // 마술피리 · 피가로의 결혼 · 세비야의 이발사
  ['왈츠', [16, 26]],
  ['빠른 피아노', [10, 16, 17, 18]],                      // 베토벤 · 쇼팽 · 리스트
  ['잔잔한 피아노', [9, 14, 25]],
  ['강렬한 첫머리', [4, 11, 19]],                         // 토카타와 푸가 · 운명 · 차라투스트라
  ['합창 · 종교 음악', [1, 2, 5, 7]],
  ['관현악', [3, 6, 15, 21, 22]],
  ['낯선 현대 음악', [20, 27, 28]],
  ['영화 · 대중음악', [22, 23, 24, 32]]
];
export const similarGroups = () => SIMILAR.map(([name, ids]) => ({
  label: `${name} · ${ids.length}곡`,
  songs: ids.map((id) => SONGS.find((s) => s.id === id))
}));
