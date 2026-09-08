// Hand-laid travel routes for the glow lights, in the same 2560 x 1708.497
// coordinate space as pcb-source.ts's artwork (see PCB_TILE_W/H there).
// Each is a simple bent polyline sweeping generally top-to-bottom and
// left-to-right, matching the artwork's own overall flow. Precision against
// the real trace geometry doesn't matter — the light only ever becomes
// visible where it happens to sit over real path pixels (see
// circuit-background.tsx's mask), so these just need to sweep across
// regions that have traces, not trace them exactly.
export const PCB_ROUTES: string[] = [
  "M 60,0 L 60,380 L 380,700 L 380,1100 L 700,1450 L 700,1708.497",
  "M 420,0 L 420,320 L 760,650 L 760,1000 L 1080,1320 L 1080,1708.497",
  "M 900,0 L 1180,300 L 1180,680 L 1480,980 L 1480,1708.497",
  "M 1550,0 L 1550,380 L 1850,680 L 1850,1080 L 2150,1380 L 2150,1708.497",
  "M 2200,0 L 2400,280 L 2400,680 L 2100,980 L 2100,1708.497",
  "M 0,260 L 320,260 L 620,560 L 920,560 L 1220,860 L 1520,860 L 1820,1160 L 2120,1160 L 2400,1440",
  "M 0,860 L 380,860 L 680,1160 L 980,1160 L 1280,1460 L 1580,1460 L 1880,1708.497",
  "M 2560,180 L 2220,480 L 2220,880 L 1920,1180 L 1920,1708.497",
  "M 1300,0 L 1300,480 L 1000,780 L 1000,1708.497",
  "M 780,0 L 780,300 L 780,700 L 480,1000 L 480,1400 L 260,1708.497",
  "M 0,1440 L 620,1440 L 920,1240 L 1520,1240 L 1820,1490 L 2560,1490",
  "M 300,0 L 320,480 L 280,880 L 320,1280 L 300,1708.497",
];
