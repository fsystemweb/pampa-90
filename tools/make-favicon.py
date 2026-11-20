#!/usr/bin/env python3
"""Builds the Pampa '90 favicon set from one 16x16 pixel grid (palette colours only).

Writes assets/icons/favicon.svg, favicon-32.png and apple-touch-icon.png (180x180).
Run from the repo root: python3 tools/make-favicon.py   (pure stdlib, no dependencies)
"""
import struct, zlib, os

# colours from src/data/palette.js
PAL = {
    'k': (0x14, 0x12, 0x1c),  # black (outline, patches)
    'w': (0xf4, 0xf1, 0xe8),  # white (ball)
    's': (0xb4, 0xb6, 0xc0),  # silver (ball shade)
    't': (0x18, 0xb5, 0xa8),  # teal (background)
    'd': (0x0e, 0x7a, 0x76),  # tealDark (border / ground shadow)
    'y': (0xf7, 0xd3, 0x1f),  # yellow (headband stripe)
}

# An 8-bit football on a teal tile with a yellow stripe (the hero's headband colour).
GRID = [
    "dddddddddddddddd",
    "dttttttttttttttd",
    "dtttttkkkkkttttd",
    "dtttkkwwkwwkkttd",
    "dttkwwwkkkwwwktd",
    "dttkwwwkkkwwwktd",
    "dtkkkwwwkwwwkkkd",
    "dtkwkkwwwwwkkskd",
    "dtkwwwwwwwwwsskd",
    "dtkwwwkkkwwwsskd",
    "dttkwkkkkkwssktd",
    "dttkkwkkkwsskktd",
    "dtttkkwwwsskkttd",
    "dyyyyykkkkkyyyyd",
    "dtttttdddddttttd",
    "dddddddddddddddd",
]
N = 16
assert len(GRID) == N and all(len(r) == N for r in GRID)

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')
os.makedirs(OUT, exist_ok=True)


def hexc(c):
    return '#%02x%02x%02x' % c


def write_svg(path):
    rects = []
    for y, row in enumerate(GRID):
        x = 0
        while x < N:  # merge horizontal runs of one colour
            ch, x0 = row[x], x
            while x < N and row[x] == ch:
                x += 1
            rects.append(f'<rect x="{x0}" y="{y}" width="{x - x0}" height="1" fill="{hexc(PAL[ch])}"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" shape-rendering="crispEdges">'
           + ''.join(rects) + '</svg>\n')
    with open(path, 'w') as f:
        f.write(svg)


def write_png(path, size):
    scale = size // N
    pad = (size - scale * N) // 2
    border = PAL['d']
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            gx, gy = (px - pad) // scale, (py - pad) // scale
            c = PAL[GRID[gy][gx]] if 0 <= gx < N and 0 <= gy < N and px >= pad and py >= pad else border
            row += bytes(c)
        rows.append(bytes(row))
    raw = b''.join(rows)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


write_svg(os.path.join(OUT, 'favicon.svg'))
write_png(os.path.join(OUT, 'favicon-32.png'), 32)
write_png(os.path.join(OUT, 'apple-touch-icon.png'), 180)
print('wrote assets/icons/{favicon.svg,favicon-32.png,apple-touch-icon.png}')
