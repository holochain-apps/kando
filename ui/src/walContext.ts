import type { Uuid } from "./board";

// A KanDo WAL always points at a board document via its hrl; the `context`
// field of the WAL determines which slice of that board the asset refers to:
//
//   ""  | undefined        -> the whole board
//   "group:<groupId>"      -> a single column (group)
//   "<cardId>"             -> a single card   (bare uuid, kept for back-compat)
//
// Columns are prefixed so they can be told apart from cards, which share the
// same uuid shape. All encoding/decoding of the context string lives here.

const COLUMN_PREFIX = "group:";

export type WalTarget =
  | { kind: "board" }
  | { kind: "column"; id: Uuid }
  | { kind: "card"; id: Uuid };

export const columnContext = (groupId: Uuid): string =>
  `${COLUMN_PREFIX}${groupId}`;

export const parseContext = (context: string | undefined): WalTarget => {
  if (!context) return { kind: "board" };
  if (context.startsWith(COLUMN_PREFIX)) {
    return { kind: "column", id: context.slice(COLUMN_PREFIX.length) };
  }
  return { kind: "card", id: context };
};
