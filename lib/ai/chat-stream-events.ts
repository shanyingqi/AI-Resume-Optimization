export type ChatStreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; content: string }
  | { type: "error"; message: string };
