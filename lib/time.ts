/** Compact relative time in trader style: "now", "4m", "2h", "1d". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** "09:41:07" local clock. */
export function clockTime(d: Date = new Date()): string {
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** "14:05" from ISO timestamp, local time. */
export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** True when local time is before 09:30 (used for briefing-first landing). */
export function isPreMarket(d: Date = new Date()): boolean {
  return d.getHours() < 9 || (d.getHours() === 9 && d.getMinutes() < 30);
}

export function briefingDate(d: Date = new Date()): string {
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
