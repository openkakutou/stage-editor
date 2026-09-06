// A small shared helper for the common undo/redo shape every field commit
// in this app's editors reduces to: "set this one thing to a new value;
// undo sets it back to the old one" (backlog item 008). `apply` owns both
// the domain mutation and whatever DOM refresh keeps that single field's
// own display in sync -- never a full editor rerender, so this stays safe
// to call synchronously from `CommandStack.push` (which invokes `do()`
// immediately) without disturbing an in-progress Tab/focus move the way a
// full list rebuild would (see elements-editor.ts's own doc comment on
// why a plain field commit never triggers one).
import type { Command } from "@openkakutou/web-ui-kit";

export interface FieldCommandOptions<T> {
  /** The value in effect before this commit -- what `undo()` restores. */
  oldValue: T;
  /** The value this commit set -- what `do()`/redo re-applies. */
  newValue: T;
  /** Sets the field to `value` and refreshes whatever DOM reflects it. Called by both `do()` and `undo()`, so it must be idempotent for a value already in effect. */
  apply: (value: T) => void;
  /** Forwarded to the resulting `Command` -- see `Command.coalesceKey`. */
  coalesceKey?: string;
}

/** Builds a `Command` for a single field commit from an old/new value pair and how to apply either. */
export function fieldCommand<T>(options: FieldCommandOptions<T>): Command {
  const { oldValue, newValue, apply, coalesceKey } = options;
  return {
    do: () => apply(newValue),
    undo: () => apply(oldValue),
    coalesceKey,
  };
}
