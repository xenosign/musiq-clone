/** @type {Record<string, Array<{title: string, artist: string, year: number}>>} */
const SONGS = {
  '1980': [
    { title: '단발머리', artist: '조용필', year: 1980 },
    { title: '창밖의 여자', artist: '조용필', year: 1982 },
    { title: '붉은 노을', artist: '이문세', year: 1988 },
    { title: '가로수 그늘 아래 서면', artist: '이문세', year: 1988 },
    { title: '홀로 된다는 것', artist: '변진섭', year: 1988 },
    { title: '너에게로 또다시', artist: '변진섭', year: 1989 },
    { title: '리듬 속의 그 춤을', artist: '김완선', year: 1988 },
    { title: '어젯밤 이야기', artist: '소방차', year: 1988 },
    { title: '오늘 밤에', artist: '소방차', year: 1989 },
    { title: '나는 행복한 사람', artist: '임현정', year: 1985 },
  ],
  '1990': [
    { title: '난 알아요', artist: '서태지와 아이들', year: 1992 },
    { title: '하여가', artist: '서태지와 아이들', year: 1993 },
    { title: '캔디', artist: 'H.O.T', year: 1996 },
    { title: '전사의 후예', artist: 'H.O.T', year: 1997 },
    { title: '기사도', artist: '젝스키스', year: 1997 },
    { title: '영원한 사랑', artist: '핑클', year: 1998 },
    { title: 'S.E.S - I\'m Your Girl', artist: 'S.E.S', year: 1997 },
    { title: '보이지 않는 사랑', artist: '신승훈', year: 1990 },
    { title: '나보다 조금 더 높은 곳에 니가 있을 뿐', artist: '신승훈', year: 1992 },
    { title: '이별 그 이후', artist: '룰라', year: 1994 },
    { title: '사랑하기 때문에', artist: '유재하', year: 1987 },
    { title: '가시나무', artist: '시인과 촌장', year: 1989 },
  ],
  '2000': [
    { title: '거짓말', artist: '빅뱅', year: 2007 },
    { title: 'Tell Me', artist: '원더걸스', year: 2007 },
    { title: 'No.1', artist: '보아', year: 2002 },
    { title: 'Gee', artist: '소녀시대', year: 2009 },
    { title: '10 Minutes', artist: '이효리', year: 2003 },
    { title: '하루하루', artist: '빅뱅', year: 2008 },
    { title: '미쳐', artist: '2NE1', year: 2009 },
    { title: '어쩌다', artist: '브라운 아이드 걸스', year: 2008 },
    { title: '남자답게', artist: '비', year: 2003 },
    { title: '믿어요', artist: '동방신기', year: 2004 },
    { title: '바보', artist: '슈퍼주니어', year: 2005 },
    { title: '원', artist: '신화', year: 2004 },
  ],
  '2010': [
    { title: '강남스타일', artist: '싸이', year: 2012 },
    { title: 'DNA', artist: 'BTS', year: 2017 },
    { title: 'DDU-DU DDU-DU', artist: '블랙핑크', year: 2018 },
    { title: 'Growl', artist: 'EXO', year: 2013 },
    { title: 'Call Me Baby', artist: 'EXO', year: 2014 },
    { title: 'CHEER UP', artist: 'TWICE', year: 2016 },
    { title: 'TT', artist: 'TWICE', year: 2016 },
    { title: '팔레트', artist: '아이유', year: 2017 },
    { title: '좋은 날', artist: '아이유', year: 2011 },
    { title: '빨간 맛', artist: '레드벨벳', year: 2017 },
    { title: 'FIRE', artist: 'BTS', year: 2016 },
    { title: '아름다워', artist: 'WINNER', year: 2014 },
  ],
  '2021': [
    { title: 'Butter', artist: 'BTS', year: 2021 },
    { title: 'Next Level', artist: 'aespa', year: 2021 },
    { title: 'ELEVEN', artist: 'IVE', year: 2021 },
    { title: 'ASAP', artist: 'STAYC', year: 2021 },
    { title: 'Celebrity', artist: '아이유', year: 2021 },
    { title: 'Queendom', artist: 'Red Velvet', year: 2021 },
    { title: 'LALALA', artist: 'B1A4', year: 2021 },
    { title: 'Alcohol-Free', artist: 'TWICE', year: 2021 },
  ],
  '2022': [
    { title: 'LOVE DIVE', artist: 'IVE', year: 2022 },
    { title: 'Attention', artist: 'NewJeans', year: 2022 },
    { title: 'FEARLESS', artist: '르세라핌', year: 2022 },
    { title: 'Pink Venom', artist: '블랙핑크', year: 2022 },
    { title: 'After LIKE', artist: 'IVE', year: 2022 },
    { title: '야야야', artist: 'NMIXX', year: 2022 },
    { title: '음오아예', artist: 'Kep1er', year: 2022 },
    { title: 'Bad Boy Sad Girl', artist: 'TREASURE', year: 2022 },
  ],
  '2023': [
    { title: 'Ditto', artist: 'NewJeans', year: 2023 },
    { title: 'I AM', artist: 'IVE', year: 2023 },
    { title: '꽃', artist: '아이유', year: 2023 },
    { title: 'Super', artist: '세븐틴', year: 2023 },
    { title: 'Queencard', artist: '(여자)아이들', year: 2023 },
    { title: 'OMG', artist: 'NewJeans', year: 2023 },
    { title: 'UNFORGIVEN', artist: '르세라핌', year: 2023 },
    { title: 'Spicy', artist: 'aespa', year: 2023 },
  ],
  '2024': [
    { title: 'Magnetic', artist: 'ILLIT', year: 2024 },
    { title: 'How Sweet', artist: 'NewJeans', year: 2024 },
    { title: 'Whiplash', artist: 'aespa', year: 2024 },
    { title: 'Smart', artist: '르세라핌', year: 2024 },
    { title: 'gods', artist: '(여자)아이들', year: 2024 },
    { title: 'SHEESH', artist: 'BABYMONSTER', year: 2024 },
    { title: 'APT.', artist: '로제', year: 2024 },
    { title: '쇼핑몰', artist: '아이유', year: 2024 },
  ],
  '2025': [
    { title: 'Supernatural', artist: 'NewJeans', year: 2025 },
    { title: '별별별', artist: '아이유', year: 2025 },
    { title: 'Born Pink', artist: '블랙핑크', year: 2025 },
    { title: 'Crazy', artist: 'LE SSERAFIM', year: 2025 },
    { title: 'Mantra', artist: 'JENNIE', year: 2025 },
    { title: 'Lucky Girl Syndrome', artist: 'ILLIT', year: 2025 },
  ],
};

function getSongsForDecades(decades) {
  const result = [];
  for (const decade of decades) {
    const songs = SONGS[decade] ?? [];
    for (const song of songs) {
      result.push({ ...song, decade });
    }
  }
  return result;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { SONGS, getSongsForDecades, shuffle };
