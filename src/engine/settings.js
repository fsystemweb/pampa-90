// Small persisted user settings (accessibility toggles etc.).
// The UI to change them lands with the accessibility pass (M9); systems that
// flash the screen read `settings.reducedFlash` through ui.flash().

const KEY = 'pampa90.settings';

export const settings = {
  reducedFlash: false,
};

try {
  Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch { /* storage unavailable or corrupt - keep defaults */ }

export function setSetting(name, value) {
  settings[name] = value;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}
