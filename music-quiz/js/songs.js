// 음악 감상 목록 32곡 — 최고 관리자님이 처음 전달받은 원본 목록 표기 그대로 (Notion 은 링크·시작 초 대조용)
// meta: 작곡가·시대, title: 작품명, vid: 유튜브 영상 ID(없으면 링크 없음), start: 시작 초
// 'X(Y)' 는 X 대신 Y 를 써도 정답 (grade.js 참조)
export const SONGS = [
  { id: 1, meta: '중세시대', title: '성요한 찬가', vid: '3iR3bJKk1Xc', start: 0 },
  { id: 2, meta: '르네상스 시대(조스캥 데프레)', title: '아베마리아', vid: 'FNbIyFlvxlk', start: 3 },
  { id: 3, meta: '비발디', title: '사계 中 봄 1악장', vid: 'ZcvufxsthGs', start: 10 },
  { id: 4, meta: '바흐', title: '토카타와 푸가 라단조', vid: 'Nnuq9PXbywA', start: 0 },
  { id: 5, meta: '헨델', title: '오라토리오 ‘메시아’ 중 ‘할렐루야’', vid: 'u6_nJ11BgTE', start: 2 },
  { id: 6, meta: '하이든', title: '트럼펫 협주곡 3악장', vid: '58vkAIlm8z0', start: 0 },
  { id: 7, meta: '모차르트', title: '레퀴엠 중 라크리모사', vid: 'VixAWkjyhx0', start: 0 },
  { id: 8, meta: '모차르트', title: '오페라 ‘마술피리’ 中 밤의 여왕의 아리아(지옥의 복수심 내 마음속에 끓어오르고)', vid: 's7vJcUogrEI', start: 11 },
  { id: 9, meta: '베토벤', title: '월광소나타 1악장', vid: '28lA52yQvwk', start: 7 },
  { id: 10, meta: '베토벤', title: '비창소나타 3악장', vid: 'DNouyWhngck', start: 7 },
  { id: 11, meta: '베토벤', title: '교향곡 5번 운명', vid: 'NWWbA5H5pEs', start: 7 },
  { id: 12, meta: '로시니', title: '오페라 ‘세비야의 이발사’ 中 ‘나는 거리의 만물박사’', vid: 'qovJV2cSr6I', start: 18 },
  { id: 13, meta: '슈베르트', title: '마왕', vid: 'GGelWMD8PtQ', start: 0 },
  { id: 14, meta: '드뷔시', title: '달빛', vid: '97_VJve7UVc', start: 0 },
  { id: 15, meta: '라벨', title: '볼레로', vid: 'f4iMjjnXbT4', start: 0 },
  { id: 16, meta: '쇼팽', title: '왈츠 7번 op.64 no.2', vid: 'cSmU9qu-tKM', start: 0 },
  { id: 17, meta: '쇼팽', title: '에튀드 op.25 no.11 ‘겨울바람’', vid: '60Upg8Hz0rI', start: 0 },
  { id: 18, meta: '리스트', title: '대연습곡 S.141. no.3 ‘라캄파넬라’', vid: 'Hf2MFBz4S_g', start: 0 },
  { id: 19, meta: '슈트라우스', title: '차라투스트라는 이렇게 말했다.', vid: 'o-lzzuEVSMY', start: 0 },
  { id: 20, meta: '슈톡하우젠', title: '습작2', vid: 'y5Kh6c8GMCA', start: 6 },
  { id: 21, meta: '비제', title: '카르멘 서곡', vid: 'WRddSpJjx40', start: 0 },
  { id: 22, meta: '존 캔더(존 칸더)', title: '뉴욕뉴욕', vid: 'LOFxFNV5DBQ', start: 12 },
  { id: 23, meta: '키무라 유미', title: '언제나 몇 번이라도', vid: 'mHZU4O_r6R8', start: 0 },
  { id: 24, meta: '하지영', title: '여행을 떠나요', vid: 'muSCAQpiebs', start: 0 },
  { id: 25, meta: '에릭 사티', title: '짐노페디 1번', vid: 'M9XPfymOx3Q', start: 0 },
  { id: 26, meta: '쇼스타코비치', title: '재즈모음곡 중 왈츠 2번', vid: 'gYSRrer6iO8', start: 0 },
  // 원본은 '4:33'. Notion 표기 '4분 33초' 도 정답으로 받으려고 괄호 대체로 둔다
  { id: 27, meta: '존 케이지', title: '4:33(4분 33초)', vid: '', start: 0 },
  { id: 28, meta: '쇤베르크', title: '달에 홀린 피에로 8번 밤', vid: 'Y2-1H9yhU2A', start: 0 },
  { id: 29, meta: '로시니', title: '오페라 ‘세비야의 이발사’ 中 ‘방금 들린 그대 음성’', vid: 'pqwnxEf-2KY', start: 108 },
  { id: 30, meta: '모차르트', title: '오페라 ‘피가로의 결혼’ 中 ‘더 이상 날지 못하리 나비야’', vid: 'MXXzaogIn_I', start: 2 },
  { id: 31, meta: '모차르트', title: '오페라 ‘피가로의 결혼’ 中 ‘편지 이중창’', vid: 'un7tf_iCGPA', start: 0 },
  { id: 32, meta: '이병우', title: '영화 장화홍련 中 돌이킬 수 없는 걸음', vid: 'oeLHy3dIiXs', start: 0 }
];

// 전체 목록 묶음 — Notion 페이지의 소제목과 같다
export const GROUPS = [
  { label: '1 – 10', from: 1, to: 10 },
  { label: '11 – 20', from: 11, to: 20 },
  { label: '21 – 32', from: 21, to: 32 }
];
