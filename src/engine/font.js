// Custom 8x8 bitmap font. Glyphs are 5 px wide inside an 8x8 cell (advance 6 px),
// stored as 8 rows of 5-bit values (bit 4 = leftmost pixel).
// Covers printable ASCII plus the Spanish extras used by the ES strings.
// Capital accents (A/E/I/O/U) are not drawn: write them unaccented.

export const CELL = 8;
export const ADVANCE = 6;
export const LINE_HEIGHT = 10;

const EXTRA = '¡¿Ññáéíóúü';

// ASCII 32..126 in order, then EXTRA. 16 hex digits = 8 rows.
const DATA = [
  '0000000000000000', // space
  '0404040404000400', // !
  '0A0A0A0000000000', // "
  '0A0A1F0A1F0A0A00', // #
  '040F140E051E0400', // $
  '1819020408130300', // %
  '0C12140815120D00', // &
  '0404080000000000', // '
  '0204080808040200', // (
  '0804020202040800', // )
  '0004150E15040000', // *
  '0004041F04040000', // +
  '00000000000C0408', // ,
  '0000001F00000000', // -
  '00000000000C0C00', // .
  '0001020408100000', // /
  '0E11131519110E00', // 0
  '040C040404040E00', // 1
  '0E11010204081F00', // 2
  '1F02040201110E00', // 3
  '02060A121F020200', // 4
  '1F101E0101110E00', // 5
  '0608101E11110E00', // 6
  '1F01020408080800', // 7
  '0E11110E11110E00', // 8
  '0E11110F01020C00', // 9
  '000C0C000C0C0000', // :
  '000C0C000C040800', // ;
  '0204081008040200', // <
  '00001F001F000000', // =
  '0804020102040800', // >
  '0E11010204000400', // ?
  '0E11171517100E00', // @
  '0E11111F11111100', // A
  '1E11111E11111E00', // B
  '0E11101010110E00', // C
  '1C12111111121C00', // D
  '1F10101E10101F00', // E
  '1F10101E10101000', // F
  '0E11101711110F00', // G
  '1111111F11111100', // H
  '0E04040404040E00', // I
  '0702020202120C00', // J
  '1112141814121100', // K
  '1010101010101F00', // L
  '111B151511111100', // M
  '1111191513111100', // N
  '0E11111111110E00', // O
  '1E11111E10101000', // P
  '0E11111115120D00', // Q
  '1E11111E14121100', // R
  '0F10100E01011E00', // S
  '1F04040404040400', // T
  '1111111111110E00', // U
  '11111111110A0400', // V
  '1111111515150A00', // W
  '11110A040A111100', // X
  '1111110A04040400', // Y
  '1F01020408101F00', // Z
  '0E08080808080E00', // [
  '0010080402010000', // \
  '0E02020202020E00', // ]
  '040A110000000000', // ^
  '000000000000001F', // _
  '0804020000000000', // `
  '00000E010F110F00', // a
  '1010161911191600', // b
  '00000E1010110E00', // c
  '01010D1311130D00', // d
  '00000E111F100E00', // e
  '0609081C08080800', // f
  '00000F11110F010E', // g
  '1010161911111100', // h
  '04000C0404040E00', // i
  '020006020202120C', // j
  '1010121418141200', // k
  '0C04040404040E00', // l
  '00001A1515151500', // m
  '0000161911111100', // n
  '00000E1111110E00', // o
  '00001E11111E1010', // p
  '00000F11110F0101', // q
  '0000161910101000', // r
  '00000F100E011E00', // s
  '08081C0808090600', // t
  '0000111111130D00', // u
  '00001111110A0400', // v
  '0000111515150A00', // w
  '0000110A040A1100', // x
  '00001111110F010E', // y
  '00001F0204081F00', // z
  '0204040804040200', // {
  '0404040404040400', // |
  '0804040204040800', // }
  '0000081502000000', // ~
  // EXTRA: ¡ ¿ Ñ ñ á é í ó ú ü
  '0004000404040400', // ¡
  '000400040810110E', // ¿
  '0D11111915131111', // Ñ
  '0D00161911111100', // ñ
  '02040E010F110F00', // á
  '02040E111F100E00', // é
  '02040C0404040E00', // í
  '02040E1111110E00', // ó
  '0204111111130D00', // ú
  '0A00111111130D00', // ü
];

export const CHARSET = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + EXTRA;

// glyph rows by character
const GLYPHS = new Map();
[...CHARSET].forEach((ch, i) => {
  const hex = DATA[i];
  const rows = [];
  for (let r = 0; r < 8; r++) rows.push(parseInt(hex.substr(r * 2, 2), 16));
  GLYPHS.set(ch, rows);
});

export const hasGlyph = (ch) => GLYPHS.has(ch);

// ---------------------------------------------------------------- atlas cache
// One tinted atlas canvas per colour, built lazily. Glyph n lives at x = n * 8.
const atlases = new Map();
const index = new Map([...CHARSET].map((ch, i) => [ch, i]));

function atlasFor(color) {
  let a = atlases.get(color);
  if (a) return a;
  a = document.createElement('canvas');
  a.width = CHARSET.length * CELL;
  a.height = CELL;
  const c = a.getContext('2d');
  c.fillStyle = color;
  [...CHARSET].forEach((ch, i) => {
    const rows = GLYPHS.get(ch);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 5; x++) {
        if (rows[y] & (0x10 >> x)) c.fillRect(i * CELL + x, y, 1, 1);
      }
    }
  });
  atlases.set(color, a);
  return a;
}

// ---------------------------------------------------------------- text API
/** Width in px of a (single-line) string. */
export function measure(text, scale = 1) {
  return Math.max(0, String(text).length * ADVANCE - 1) * scale;
}

/** Greedy word wrap to maxWidth px. Honours explicit "\n". */
export function wrap(text, maxWidth) {
  const maxChars = Math.max(1, Math.floor((maxWidth + 1) / ADVANCE));
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (next.length <= maxChars) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Draw text. opts: { color, align: 'left'|'center'|'right', shadow: color|null,
 * maxWidth (wraps), chars (draw only the first N chars: typewriter),
 * scale (integer pixel multiplier), shadowOffset (px, default = scale) }
 * Returns the number of lines drawn.
 */
export function drawText(ctx, text, x, y, opts = {}) {
  const { color = '#f4f1e8', align = 'left', shadow = null, maxWidth = 0, chars = Infinity, scale = 1 } = opts;
  const so = opts.shadowOffset ?? scale;
  const lines = maxWidth ? wrap(text, Math.floor(maxWidth / scale)) : String(text).split('\n');
  let left = chars;
  lines.forEach((line, li) => {
    const shown = line.slice(0, Math.max(0, left));
    left -= line.length + 1;
    let lx = Math.round(x);
    const w = measure(line, scale);
    if (align === 'center') lx = Math.round(x - w / 2);
    else if (align === 'right') lx = Math.round(x - w);
    const ly = Math.round(y) + li * LINE_HEIGHT * scale;
    if (shadow) blit(ctx, shown, lx + so, ly + so, shadow, scale);
    blit(ctx, shown, lx, ly, color, scale);
  });
  return lines.length;
}

function blit(ctx, str, x, y, color, scale = 1) {
  const atlas = atlasFor(color);
  for (let i = 0; i < str.length; i++) {
    const g = index.get(str[i]) ?? index.get('?');
    if (str[i] !== ' ') ctx.drawImage(atlas, g * CELL, 0, CELL, CELL, x + i * ADVANCE * scale, y, CELL * scale, CELL * scale);
  }
}
