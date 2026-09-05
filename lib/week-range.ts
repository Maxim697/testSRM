export function getWeekRange(weekStart: string): { start: string; end: string; endDate: string } {
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  const endDate = new Date(start);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    endDate: endDate.toISOString().slice(0, 10),
  };
}
