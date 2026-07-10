import type { CalendarProvider } from "./types";
import { MockCalendarProvider } from "./mockProvider";

// The single calendar instance the UI talks to. Swapping mock → real feed
// (ForexFactory-grade data, licensed) is one assignment here.
export const calendarProvider: CalendarProvider = new MockCalendarProvider();

export type * from "./types";
export { calendarEventToNewsItem } from "./types";
