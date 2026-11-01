/* ТЕХНИЧЕСКИЕ НАСТРОЙКИ. Тексты Кротика: src/content/dialogues.js, воспоминания и письмо: src/content/archive.js */
export const CONFIG = {
  secretDate: "02.11.2025",            // DD.MM.YYYY, секретная дата на входе
  hint: "HINT: THE DAY IT ALL BEGAN",  // подсказка при неверной дате (по-английски)
  unlockAt: "2026-11-02T00:00:00+05:00", // до этого момента виден только обратный отсчёт (GMT+5), потом салют и кнопка входа
  puzzlePhoto: "photos/us.jpg",        // фото для пазла: public/photos/us.jpg (любой размер, обрежется до квадрата)
};