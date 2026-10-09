import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * Mozaik tesserası deseni (DESIGN.md · Auth ekranları) — Hatay (Antakya) mozaiklerine gönderme.
 * Saf CSS grid, kare taşlar, düşük opaklık. Desen deterministiktir (sabit tohum) → sunucu ve
 * istemcide aynı, statik kabuğa girer.
 *
 * Performans: zemin taşları tek bir CSS arka planıyla (derz çizgileri) çizilir; DOM'a sadece
 * renkli taşlar (meander bandı, çerçeve şeritleri, seyrek renkli/ton farklı taşlar) girer.
 */

const TILE = 18; // px
const GAP = 3; // px (derz)
const COLS = 46;
const ROWS = 64;

/** Küçük, deterministik PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Meander (Yunan anahtarı) birimi: 6 geniş × 5 yüksek, yatayda tekrar eder. */
const MEANDER = ["111110", "100010", "101010", "101110", "100000"];
const BAND_TOP = 9;
const FRAME_ROWS = new Set([BAND_TOP - 2, BAND_TOP + MEANDER.length + 1]);

type Tile = { row: number; col: number; color: string; opacity: number };

function buildTiles(): Tile[] {
  const random = rng(1938); // Hatay'ın Türkiye'ye katılış yılı
  const tiles: Tile[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const noise = random();
      const pick = random();
      const bandRow = r - BAND_TOP;
      const tile = (color: string, opacity: number) => tiles.push({ row: r + 1, col: c + 1, color, opacity });

      if (bandRow >= 0 && bandRow < MEANDER.length) {
        if (MEANDER[bandRow]![c % 6] === "1") tile("var(--tessera-laurel)", 0.22 + noise * 0.1);
      } else if (FRAME_ROWS.has(r)) {
        tile("var(--tessera-saffron)", 0.13 + noise * 0.07);
      } else if (pick < 0.012) {
        tile("var(--tessera-sky)", 0.13 + noise * 0.08);
      } else if (pick < 0.02) {
        tile("var(--tessera-brick)", 0.12 + noise * 0.06);
      } else if (pick < 0.03) {
        tile("var(--tessera-laurel)", 0.1 + noise * 0.06);
      } else if (pick < 0.16) {
        // Zemin taşlarında ton farkı (el yapımı mozaik hissi)
        tile("var(--tessera-fg)", 0.035 + noise * 0.04);
      }
    }
  }
  return tiles;
}

const TILES = buildTiles();

const gridStyle: CSSProperties = {
  gridTemplateColumns: `repeat(${COLS}, ${TILE}px)`,
  gridAutoRows: `${TILE}px`,
  gap: GAP,
  padding: GAP,
  // Zemin taşları: derz çizgileri tessera zemininde, taşlar çok hafif açık ton.
  backgroundColor: "color-mix(in oklab, var(--tessera-fg) 4%, var(--tessera-base))",
  backgroundImage: [
    `linear-gradient(to right, var(--tessera-base) ${GAP}px, transparent ${GAP}px)`,
    `linear-gradient(to bottom, var(--tessera-base) ${GAP}px, transparent ${GAP}px)`,
  ].join(", "),
  backgroundSize: `${TILE + GAP}px ${TILE + GAP}px`,
};

export function Tessera({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="grid h-full w-max min-w-full" style={gridStyle}>
        {TILES.map((t) => (
          <span
            key={`${t.row}-${t.col}`}
            className="rounded-[1.5px]"
            style={{
              gridRow: t.row,
              gridColumn: t.col,
              backgroundColor: t.color,
              opacity: Number(t.opacity.toFixed(3)),
            }}
          />
        ))}
      </div>
      {/* Metnin okunması için alttan koyulaşan perde */}
      <div className="absolute inset-0 bg-linear-to-t from-tessera via-tessera/75 to-transparent" />
    </div>
  );
}
