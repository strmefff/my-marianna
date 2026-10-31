/*
 * ПЛЕЕР (iPod). Первая песня это фоновая музыка сайта (music box), она играет сама.
 * Свои песни: положи mp3 в public/music/ и добавь строку ниже, путь пиши без public.
 * Если файл не найдётся, плеер сам вернётся к фоновой музыке.
 */
export const PLAYLIST = [
  { kind: 'synth', title: 'Music Box', artist: 'For Marianna', album: 'Background music' },
  { kind: 'file', title: 'Lyubimyy tsvet', artist: 'Noize MC', album: 'Favourite', src: 'music/112325.mp3' },
  { kind: 'file', title: 'Back to Friends', artist: 'sombr', album: 'Favourite', src: 'music/back to friends.mp3' },
  { kind: 'file', title: 'Treat You Better', artist: 'Shawn Mendes', album: 'Favourite', src: 'music/Treat You Better.mp3' },
  { kind: 'file', title: 'Nothing Without You', artist: 'The Weeknd', album: 'Favourite', src: 'music/weeknd.mp3' },
  { kind: 'file', title: 'Anna of the North', artist: 'Lovers', album: 'Favourite', src: 'music/lovers.mp3' },

  
  // { kind: 'file', title: 'Название', artist: 'Исполнитель', album: 'Альбом', src: 'music/song.mp3' },
];
