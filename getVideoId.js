const { spawnSync } = require('child_process');
const fs = require('fs');

const { SONGS } = require('./songs');

/**
 * yt-dlp로 유튜브 검색 후 상위 1개 비디오 ID를 반환합니다.
 * @param {string} query - 검색 쿼리
 * @returns {string|null} - 비디오 ID 또는 null
 */
function getYoutubeId(query) {
  try {
    const result = spawnSync(
      'yt-dlp',
      [
        `ytsearch1:${query}`, // 상위 1개 검색
        '--print',
        'id', // ID만 출력 (다운로드 없음)
        '--no-playlist',
        '--no-warnings',
        '--quiet',
      ],
      {
        encoding: 'utf-8',
        timeout: 20000,
        shell: false,
        env: {
          // 환경변수로 인코딩 강제
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1',
        },
      },
    );

    if (result.error || result.status !== 0) return null;

    const output = result.stdout ? result.stdout.trim() : '';
    if (!output) return null;

    // 첫 번째 줄만 추출 (순수 비디오 ID는 11자리 영숫자)
    const firstLine = output.split('\n')[0].trim();
    return /^[a-zA-Z0-9_-]{11}$/.test(firstLine) ? firstLine : null;
  } catch {
    return null;
  }
}

/**
 * 3단계 쿼리 전략으로 비디오 ID를 검색합니다.
 * 유튜브 검색창에 직접 치는 것과 동일한 쿼리를 우선합니다.
 */
function findVideoId(title, artist) {
  const queries = [
    `${artist} ${title} 음원`, // 1단계: 유튜브 검색창과 동일
    `${artist} ${title} official audio`, // 2단계: 글로벌 쿼리
    `${artist} ${title}`, // 3단계: 단순 쿼리
  ];

  for (const query of queries) {
    const id = getYoutubeId(query);
    if (id) return { id, query };
  }

  return { id: null, query: null };
}

async function run() {
  const updatedSongs = {};
  const decades = Object.keys(SONGS);

  console.log('🚀 유튜브 ID 추출 작업을 시작합니다.');
  console.log('--------------------------------------------------');

  for (const decade of decades) {
    console.log(`\n📂 [${decade}년대] 처리 중...`);
    updatedSongs[decade] = [];

    const songsInDecade = SONGS[decade];

    for (let i = 0; i < songsInDecade.length; i++) {
      const song = songsInDecade[i];
      const progress = `(${i + 1}/${songsInDecade.length})`;

      process.stdout.write(`${progress} ${song.artist} - ${song.title} ... `);

      const { id: videoId, query: usedQuery } = findVideoId(
        song.title,
        song.artist,
      );

      if (videoId) {
        console.log(`✅ ${videoId}  [쿼리: "${usedQuery}"]`);
      } else {
        console.log('❌ 실패');
      }

      updatedSongs[decade].push({
        ...song,
        youtubeId: videoId ?? '',
      });

      // IP 차단 방지 딜레이
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  try {
    fs.writeFileSync(
      './updated_songs.json',
      JSON.stringify(updatedSongs, null, 2),
      'utf-8',
    );
    console.log('\n--------------------------------------------------');
    console.log('✨ 완료! "updated_songs.json" 저장됨');
  } catch (err) {
    console.error('\n파일 저장 에러:', err.message);
  }
}

run();
