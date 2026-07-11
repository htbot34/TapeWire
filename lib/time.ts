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

/** "Jul 10" from ISO timestamp, local time. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

/**
 * "Jul 10 · 14:32" — the unambiguous stamp every row carries so overnight and
 * multi-day items are never confused about which day they happened.
 */
export function dateTimeStamp(iso: string): string {
  return `${shortDate(iso)} · ${shortTime(iso)}`;
}

/** "14:32:07" from ISO timestamp, local time, seconds included. */
export function exactTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** "Jul 10 · 14:32:07" — the to-the-second stamp for raw-event headers. */
export function exactDateTimeStamp(iso: string): string {
  return `${shortDate(iso)} · ${exactTime(iso)}`;
}

/** Local timezone abbreviation, e.g. "EST", "GMT+2" — for the calendar header. */
export function tzLabel(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat([], { timeZoneName: "short" }).formatToParts(d);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "local";
}

/** True when both ISO timestamps fall on the same local calendar day. */
export function sameLocalDay(a: string | Date, b: string | Date): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
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
