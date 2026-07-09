/** @type {Record<string, Array<{title: string, artist: string, year: number, answer: string[]}>>} */
const SONGS = {
  1980: require('./songs/1980'),
  1990: require('./songs/1990'),
  2000: require('./songs/2000'),
  2005: require('./songs/2005'),
  2010: require('./songs/2010'),
  2015: require('./songs/2015'),
  2021: require('./songs/2021'),
  2022: require('./songs/2022'),
  2023: require('./songs/2023'),
  2024: require('./songs/2024'),
  2025: require('./songs/2025'),
  pop: require('./songs/pop'),
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
