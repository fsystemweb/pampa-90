// All player-facing text lives here (EN default, ES toggle) so it can be
// reviewed and edited in one place. Use t('key') / t('key', { n: 3 }).
//
// Font note: capital accented vowels are not in the bitmap font, so write
// them unaccented in capitalised text (e.g. "ESTA" not "ESTÁ"). Lowercase
// á é í ó ú ü ñ and ¡ ¿ Ñ are fine.

export const STRINGS = {
  en: {
    // ---- generic / UI
    'game.title': "PAMPA '90",
    'game.subtitle': 'One boot in the pampas',
    'ui.pressStart': 'PRESS START',
    'ui.tapStart': 'TAP TO START',
    'ui.skip': 'SKIP',
    'ui.retry': 'RETRY',
    'ui.next': 'NEXT',
    'ui.paused': 'PAUSED',
    'ui.resume': 'Press P to resume',
    'ui.muted': 'MUTE',
    'ui.rotate': 'ROTATE YOUR PHONE',
    'ui.lang': 'LANGUAGE: EN',
    'ui.readiness': 'PRESEASON READINESS',
    'ui.level': 'LEVEL {n} / {total}',
    'ui.start': 'START',
    'ui.tip': 'TIP',
    'ctl.move': 'Move',
    'ctl.shave': 'Shave',
    'ctl.dip': 'Dip',
    'ctl.hop': 'Hop',
    'ctl.jump': 'Jump / aim',
    'ctl.breathe': 'Breathe (hold)',
    'l1.hint': 'Short, slow strokes. Dip the razor when it clogs.',
    'l2.hint': 'Watch for the "!" - a cow is coming.',
    'l3.hint': 'Press when the ring is in the green zone.',
    'l4.hint': 'Breathe with the guide and stay calm.',

    // ---- intro
    'intro.1': 'Mid-1990s. The best player in the world is flying somewhere... over the middle of Argentina.',
    'intro.2': 'The plane drops onto a dirt strip.',
    'intro.3': 'A hut. A windsock. One rusty truck.',
    'intro.4': 'Welcome to La Pampa... nothing but sky.',

    // ---- briefings (3 lines each)
    'l1.name': 'SHAVING',
    'l1.b1': 'Clear all the foam with the razor.',
    'l1.b2': 'Go slow: fast zig-zags cut you!',
    'l1.b3': 'Then rinse in the bucket.',
    'l2.name': 'RESISTANCE',
    'l2.b1': 'Jog through the pampas.',
    'l2.b2': 'Cows on the path! Dodge them.',
    'l2.b3': 'Fill the stamina bar to finish.',
    'l3.name': 'TARGETING',
    'l3.b1': 'Your friend crosses the ball.',
    'l3.b2': 'Jump on time, then aim.',
    'l3.b3': 'Score past the keeper: 3 of 5.',
    'l4.name': 'DOCTOR CHECK',
    'l4.b1': 'Lie down and relax.',
    'l4.b2': 'Hold SPACE to breathe in, release to breathe out.',
    'l4.b3': 'Keep calm until the monitor goes green.',

    // ---- in-level flavour
    'l1.nick': 'Ay!',
    'l1.wind': 'Che, the wind!',
    'l1.clean': 'Smooth as a baby!',
    'l1.rinse': 'Splash! Dale!',
    'l2.moo': 'MOO!',
    'l2.hit': 'Watch the cow!',
    'l2.done': 'Stamina full!',
    'l3.perfect': 'PERFECT!',
    'l3.good': 'GOOD',
    'l3.early': 'TOO EARLY',
    'l3.late': 'TOO LATE',
    'l3.goal': 'GOOOL!',
    'l3.saved': 'SAVED!',
    'l3.post': 'THE POST!',
    'l3.over': 'To the farm!',
    'l3.round': 'SHOT {n} / {total}',
    'l3.cow': 'Moo.',
    'l4.again': 'Again, relax...',
    'l4.perfect': 'All perfect!',
    'l4.bpm': 'BPM {n}',
    'l4.distract': 'Stay calm...',

    // ---- results / ending
    'res.title': 'LEVEL CLEAR',
    'res.stars': 'STARS',
    'res.best': 'BEST',
    'res.time': 'TIME',
    'end.1': 'The doctor gives a thumbs up.',
    'end.2': 'Ready for the season!',
    'end.start': 'SEASON START',
    'end.total': 'TOTAL STARS: {n} / {max}',
    'end.replay': 'PLAY AGAIN',
  },

  es: {
    'game.title': "PAMPA '90",
    'game.subtitle': 'Un pie en la pampa',
    'ui.pressStart': 'APRETA START',
    'ui.tapStart': 'TOCA PARA EMPEZAR',
    'ui.skip': 'SALTAR',
    'ui.retry': 'REINTENTAR',
    'ui.next': 'SEGUIR',
    'ui.paused': 'PAUSA',
    'ui.resume': 'Apretá P para seguir',
    'ui.muted': 'MUDO',
    'ui.rotate': 'GIRA EL CELULAR',
    'ui.lang': 'IDIOMA: ES',
    'ui.readiness': 'PREPARACION DE PRETEMPORADA',
    'ui.level': 'NIVEL {n} / {total}',
    'ui.start': 'EMPEZAR',
    'ui.tip': 'CONSEJO',
    'ctl.move': 'Mover',
    'ctl.shave': 'Afeitar',
    'ctl.dip': 'Mojar',
    'ctl.hop': 'Saltar',
    'ctl.jump': 'Saltar / apuntar',
    'ctl.breathe': 'Respirar (mantener)',
    'l1.hint': 'Pasadas cortas y lentas. Mojá la afeitadora si se tapa.',
    'l2.hint': 'Atento al "!": viene una vaca.',
    'l3.hint': 'Apretá cuando el aro esté en la zona verde.',
    'l4.hint': 'Respirá con la guía y mantené la calma.',

    'intro.1': 'Mediados de los 90. El mejor jugador del mundo vuela sobre el medio de la Argentina.',
    'intro.2': 'El avión aterriza en una pista de tierra.',
    'intro.3': 'Un rancho. Una manga de viento. Un camión oxidado.',
    'intro.4': 'Bienvenido a La Pampa... solo cielo.',

    'l1.name': 'AFEITADA',
    'l1.b1': 'Sacá toda la espuma con la afeitadora.',
    'l1.b2': 'Despacio: ¡los zigzags te cortan!',
    'l1.b3': 'Después enjuagate en el balde.',
    'l2.name': 'RESISTENCIA',
    'l2.b1': 'Trotá por la pampa.',
    'l2.b2': '¡Hay vacas en el camino! Esquivalas.',
    'l2.b3': 'Llená la barra de resistencia.',
    'l3.name': 'PUNTERIA',
    'l3.b1': 'Tu amigo te tira el centro.',
    'l3.b2': 'Saltá a tiempo y apuntá.',
    'l3.b3': 'Gol al arquero: 3 de 5.',
    'l4.name': 'CONTROL MEDICO',
    'l4.b1': 'Acostate y relajate.',
    'l4.b2': 'Mantené ESPACIO para inhalar, soltá para exhalar.',
    'l4.b3': 'Mantené la calma hasta que el monitor se ponga verde.',

    'l1.nick': '¡Ay!',
    'l1.wind': '¡Che, el viento!',
    'l1.clean': '¡Suave como un bebé!',
    'l1.rinse': '¡Splash! ¡Dale!',
    'l2.moo': '¡MUU!',
    'l2.hit': '¡Cuidado con la vaca!',
    'l2.done': '¡Resistencia llena!',
    'l3.perfect': '¡PERFECTO!',
    'l3.good': 'BIEN',
    'l3.early': 'MUY TEMPRANO',
    'l3.late': 'MUY TARDE',
    'l3.goal': '¡GOOOL!',
    'l3.saved': '¡ATAJO!',
    'l3.post': '¡AL PALO!',
    'l3.over': '¡A la chacra!',
    'l3.round': 'TIRO {n} / {total}',
    'l3.cow': 'Muu.',
    'l4.again': 'De nuevo, relajate...',
    'l4.perfect': '¡Todo perfecto!',
    'l4.bpm': 'PPM {n}',
    'l4.distract': 'Calma...',

    'res.title': 'NIVEL SUPERADO',
    'res.stars': 'ESTRELLAS',
    'res.best': 'MEJOR',
    'res.time': 'TIEMPO',
    'end.1': 'El doctor levanta el pulgar.',
    'end.2': '¡Listo para la temporada!',
    'end.start': 'COMIENZA LA TEMPORADA',
    'end.total': 'ESTRELLAS: {n} / {max}',
    'end.replay': 'JUGAR OTRA VEZ',
  },
};

export const LANGS = Object.keys(STRINGS);
const STORAGE_KEY = 'pampa90.lang';

let lang = 'en';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && STRINGS[saved]) lang = saved;
} catch { /* storage unavailable - keep default */ }

const listeners = new Set();

export const getLang = () => lang;

export function setLang(next) {
  if (!STRINGS[next] || next === lang) return;
  lang = next;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  applyDom();
  listeners.forEach((fn) => fn(lang));
}

export function toggleLang() {
  setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]);
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate a key; {name} placeholders are filled from params. Falls back to EN, then the key. */
export function t(key, params) {
  const s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m)) : s;
}

/** Fill DOM elements marked with data-i18n="key" (used by the rotate overlay). */
export function applyDom() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}
