import { describe, expect, it } from "vitest";
import type { BGElement } from "../wasm/types.ts";
import {
  applyPositionOffset,
  applySpriteReassignment,
} from "./bg-element-batch-edit.ts";

function element(overrides: Partial<BGElement> = {}): BGElement {
  return {
    name: "sky",
    type: "normal",
    sprite: { group: 0, image: 0 },
    actionNumber: 0,
    layerNo: 0,
    startX: 10,
    startY: 20,
    deltaX: 0,
    deltaY: 0,
    tileX: 0,
    tileY: 0,
    tileSpacingX: 0,
    tileSpacingY: 0,
    ...overrides,
  };
}

describe("applyPositionOffset", () => {
  it("moves every selected element by the same delta, preserving relative positions", () => {
    const elements = [
      element({ startX: 10, startY: 20 }),
      element({ startX: 100, startY: 200 }),
      element({ startX: 0, startY: 0 }),
    ];

    applyPositionOffset(elements, new Set([0, 1]), 5, -3);

    expect(elements[0].startX).toBe(15);
    expect(elements[0].startY).toBe(17);
    expect(elements[1].startX).toBe(105);
    expect(elements[1].startY).toBe(197);
    // Untouched: not in the selection.
    expect(elements[2].startX).toBe(0);
    expect(elements[2].startY).toBe(0);
    // The gap between the two selected elements' positions is unchanged.
    expect(elements[1].startX - elements[0].startX).toBe(90);
  });

  it("does nothing for an empty selection", () => {
    const elements = [element({ startX: 10, startY: 20 })];

    applyPositionOffset(elements, new Set(), 5, 5);

    expect(elements[0].startX).toBe(10);
    expect(elements[0].startY).toBe(20);
  });

  it("ignores a selected index out of range rather than throwing", () => {
    const elements = [element({ startX: 10, startY: 20 })];

    expect(() =>
      applyPositionOffset(elements, new Set([0, 5]), 1, 1),
    ).not.toThrow();
    expect(elements[0].startX).toBe(11);
  });

  it("is a no-op offset (0, 0) that still leaves values unchanged", () => {
    const elements = [element({ startX: 10, startY: 20 })];

    applyPositionOffset(elements, new Set([0]), 0, 0);

    expect(elements[0].startX).toBe(10);
    expect(elements[0].startY).toBe(20);
  });
});

describe("applySpriteReassignment", () => {
  it("assigns the same sprite reference to every selected element", () => {
    const elements = [
      element({ sprite: { group: 0, image: 0 } }),
      element({ sprite: { group: 1, image: 2 } }),
      element({ sprite: { group: 9, image: 9 } }),
    ];

    applySpriteReassignment(elements, new Set([0, 2]), { group: 5, image: 7 });

    expect(elements[0].sprite).toEqual({ group: 5, image: 7 });
    expect(elements[2].sprite).toEqual({ group: 5, image: 7 });
    // Untouched: not in the selection.
    expect(elements[1].sprite).toEqual({ group: 1, image: 2 });
  });

  it("does nothing for an empty selection", () => {
    const elements = [element({ sprite: { group: 0, image: 0 } })];

    applySpriteReassignment(elements, new Set(), { group: 9, image: 9 });

    expect(elements[0].sprite).toEqual({ group: 0, image: 0 });
  });

  it("assigns independent copies, not a shared object reference across elements", () => {
    const elements = [
      element({ sprite: { group: 0, image: 0 } }),
      element({ sprite: { group: 0, image: 0 } }),
    ];

    applySpriteReassignment(elements, new Set([0, 1]), { group: 3, image: 4 });
    elements[0].sprite.group = 999;

    expect(elements[1].sprite.group).toBe(3);
  });

  it("applies uniformly regardless of element type, matching this codebase's own hidden-field convention", () => {
    // An "anim" element's `sprite` field is never shown/used by the editor,
    // but the underlying value is never specially protected either -- see
    // elements-editor.ts's own header note on hidden-but-not-cleared fields.
    const elements = [
      element({ type: "anim", sprite: { group: 0, image: 0 } }),
    ];

    applySpriteReassignment(elements, new Set([0]), { group: 5, image: 5 });

    expect(elements[0].sprite).toEqual({ group: 5, image: 5 });
  });
});
