// Pure batch-edit logic for the BG element editor's multi-select feature
// (backlog item 007). No DOM here -- elements-editor.ts wires these against
// the actual selection UI. Both functions mutate the given `elements` array
// in place, the same "caller-owned document" convention `elements-editor.ts`
// itself already follows for a single-element edit.
import type { BGElement, SpriteRef } from "../wasm/types.ts";

/**
 * Moves every element at a selected index by the same (deltaX, deltaY),
 * preserving each one's position relative to the others in the selection --
 * a *delta* is added to each one's own current position, never an absolute
 * value applied uniformly. An index outside `elements`'s bounds (e.g. a
 * stale selection from before a row was removed) is silently ignored rather
 * than throwing. An empty `selectedIndices` is a no-op, per the acceptance
 * criteria -- there is nothing defensive to special-case beyond that: the
 * loop below already does nothing when the set is empty.
 */
export function applyPositionOffset(
  elements: BGElement[],
  selectedIndices: ReadonlySet<number>,
  deltaX: number,
  deltaY: number,
): void {
  for (const index of selectedIndices) {
    const el = elements[index];
    if (el === undefined) continue;
    el.startX += deltaX;
    el.startY += deltaY;
  }
}

/**
 * Assigns the same sprite reference to every element at a selected index.
 * Applied uniformly regardless of the element's own `type` -- matching
 * elements-editor.ts's own established convention that a field irrelevant
 * to the current type (here, `sprite` for an "anim" element) is never
 * shown but is also never specially protected from being set; `stage`'s own
 * serializer already ignores it for "anim" either way.
 */
export function applySpriteReassignment(
  elements: BGElement[],
  selectedIndices: ReadonlySet<number>,
  sprite: SpriteRef,
): void {
  for (const index of selectedIndices) {
    const el = elements[index];
    if (el === undefined) continue;
    el.sprite = { ...sprite };
  }
}
