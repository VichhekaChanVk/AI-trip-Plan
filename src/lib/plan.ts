/** Split `durationDays` over `cityCount` cities in order; earlier cities get the extra day. Returns city index per day. */
export function allocateDays(durationDays: number, cityCount: number): number[] {
  const n = Math.max(1, cityCount);
  const base = Math.floor(durationDays / n);
  const extra = durationDays % n;
  const out: number[] = [];
  for (let c = 0; c < n; c++) {
    const count = base + (c < extra ? 1 : 0);
    for (let i = 0; i < count; i++) out.push(c);
  }
  return out;
}

export type Segment = { city: string; startDay: number; endDay: number };

/** Group consecutive days spent in the same city. `cityOfDay[i]` is the city for day i+1. */
export function segmentsFromDays(cityOfDay: string[]): Segment[] {
  const out: Segment[] = [];
  cityOfDay.forEach((city, i) => {
    const last = out[out.length - 1];
    if (last && last.city === city) last.endDay = i + 1;
    else out.push({ city, startDay: i + 1, endDay: i + 1 });
  });
  return out;
}
