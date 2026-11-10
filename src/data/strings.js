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
    'intro.1': 'Mid-1990s. The best player in the world flies to the middle of Argentina: to isolate and work hard for the next World Cup.',
    'intro.2': 'The plane lands on the asphalt runway at Santa Rosa airport.',
    'intro.3': 'A modest terminal. A group of locals waits behind the fence.',
    'intro.4': 'He steps out and sees the crowd: "This is my people!"',
    'intro.5': 'Then, silence: the El Marito farm, near Macachín. Welcome to La Pampa... nothing but sky.',

    // ---- briefings (3 lines each)
    'l1.name': 'SHAVING',
    'l1.b1': 'World Cup prep: clear all the foam.',
    'l1.b2': 'Go slow: fast zig-zags cut you!',
    'l1.b3': 'Then rinse in the bucket.',
    'l2.name': 'RESISTANCE',
    'l2.b1': 'Build World Cup lungs: jog through the pampas.',
    'l2.b2': 'Cows on the path! Dodge them.',
    'l2.b3': 'Fill the stamina bar to finish.',
    'l3.name': 'TARGETING',
    'l3.b1': 'World Cup aim. Your friend crosses.',
    'l3.b2': 'Jump on time, then aim.',
    'l3.b3': 'Score past the keeper: 3 of 5.',
    'l4.name': 'DOCTOR CHECK',
    'l4.b1': 'World Cup check-up. Lie down, relax.',
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
    'l4.phone': 'Brrring!',
    'l4.calm': 'CALM {n}%',
    'l4.in': 'BREATHE IN',
    'l4.out': 'BREATHE OUT',
    'l4.hold': 'Hold A to breathe in',

    // ---- minigame HUD and results
    'ui.time': 'TIME {n}',
    'l1.cover': 'CLEAN {n}%',
    'l1.clog': 'CLOGGED! B = DIP',
    'l1.rinseHint': 'Hold A, let go in the green!',
    'l1.again': 'Again!',
    'l2.stamina': 'STAMINA {n}%',
    'l3.score': 'GOALS {n} / {need}',
    'res.fail': 'TRY AGAIN',
    'res.fail.hint': 'No problem, one more try!',

    // ---- pause menu
    'ui.resumeBtn': 'RESUME',
    'ui.flash': 'REDUCED FLASH',
    'ui.on': 'ON',
    'ui.off': 'OFF',

    // ---- results / ending
    'res.title': 'LEVEL CLEAR',
    'res.stars': 'STARS',
    'res.best': 'BEST',
    'res.time': 'TIME',
    'end.1': 'The doctor gives a thumbs up.',
    'end.2': 'Ready for the World Cup! Dale, che!',
    'end.start': 'TO THE WORLD CUP',
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

    'intro.1': 'Mediados de los 90. El mejor jugador del mundo viaja al medio de la Argentina: aislarse y trabajar duro para el próximo Mundial.',
    'intro.2': 'El avión aterriza en la pista de asfalto del aeropuerto de Santa Rosa.',
    'intro.3': 'Una terminal modesta. Un grupo de vecinos espera detrás del alambrado.',
    'intro.4': 'Al bajar ve a la multitud: "¡Esta es mi gente!"',
    'intro.5': 'Después, el silencio: la estancia El Marito, cerca de Macachín. Bienvenido a La Pampa... solo cielo.',

    'l1.name': 'AFEITADA',
    'l1.b1': 'Rumbo al Mundial: sacá la espuma.',
    'l1.b2': 'Despacio: ¡los zigzags te cortan!',
    'l1.b3': 'Después enjuagate en el balde.',
    'l2.name': 'RESISTENCIA',
    'l2.b1': 'Pulmones de Mundial: trotá por la pampa.',
    'l2.b2': '¡Hay vacas en el camino! Esquivalas.',
    'l2.b3': 'Llená la barra de resistencia.',
    'l3.name': 'PUNTERIA',
    'l3.b1': 'Puntería de Mundial. Te tiran el centro.',
    'l3.b2': 'Saltá a tiempo y apuntá.',
    'l3.b3': 'Gol al arquero: 3 de 5.',
    'l4.name': 'CONTROL MEDICO',
    'l4.b1': 'Control pre-Mundial. Acostate, relajate.',
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
    'l4.phone': '¡Brrring!',
    'l4.calm': 'CALMA {n}%',
    'l4.in': 'INHALA',
    'l4.out': 'EXHALA',
    'l4.hold': 'Mantené A para inhalar',

    'ui.time': 'TIEMPO {n}',
    'l1.cover': 'LIMPIO {n}%',
    'l1.clog': 'TAPADA! B = MOJAR',
    'l1.rinseHint': 'Mantené A, soltá en el verde!',
    'l1.again': '¡Otra vez!',
    'l2.stamina': 'RESISTENCIA {n}%',
    'l3.score': 'GOLES {n} / {need}',
    'res.fail': 'OTRA VEZ',
    'res.fail.hint': 'Dale, una más!',

    'ui.resumeBtn': 'SEGUIR',
    'ui.flash': 'MENOS DESTELLOS',
    'ui.on': 'SI',
    'ui.off': 'NO',

    'res.title': 'NIVEL SUPERADO',
    'res.stars': 'ESTRELLAS',
    'res.best': 'MEJOR',
    'res.time': 'TIEMPO',
    'end.1': 'El doctor levanta el pulgar.',
    'end.2': '¡Listo para el Mundial! ¡Dale, che!',
    'end.start': 'RUMBO AL MUNDIAL',
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
