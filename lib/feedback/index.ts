import type { FeedbackProvider } from "./types";
import { LocalStorageFeedbackProvider } from "./localProvider";

// The single feedback instance the UI talks to. Swapping localStorage → API
// backend is one assignment here, mirroring lib/news/index.ts.
export const feedbackProvider: FeedbackProvider = new LocalStorageFeedbackProvider();

export type * from "./types";
export { ALL_FEEDBACK_KINDS, FEEDBACK_KINDS, FEEDBACK_LABEL } from "./types";
