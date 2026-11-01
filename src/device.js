/* Сайт сделан только под iPad. Открыть на другом устройстве для проверки: добавь к адресу ?force */
export function isIPad() {
  const ua = navigator.userAgent || '';
  if (/iPad/.test(ua)) return true;
  // iPadOS 13+ в режиме "версия для компьютера" выдаёт себя за Mac, но у Mac нет мультитача
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function deviceAllowed() {
  try {
    if (/[?&]force\b/.test(window.location.search)) sessionStorage.setItem('marianna_force', '1');
    if (sessionStorage.getItem('marianna_force') === '1') return true;
  } catch (e) {}
  return isIPad();
}