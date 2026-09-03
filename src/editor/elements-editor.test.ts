import { describe, expect, it, vi } from "vitest";
import type { SpriteGroup } from "../wasm/sff-types.ts";
import type { BGElement, StageData } from "../wasm/types.ts";
import { renderElementsEditor } from "./elements-editor.ts";

function element(overrides: Partial<BGElement> = {}): BGElement {
  return {
    name: "sky",
    type: "normal",
    sprite: { group: 0, image: 0 },
    actionNumber: 0,
    layerNo: 0,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    tileX: 0,
    tileY: 0,
    tileSpacingX: 0,
    tileSpacingY: 0,
    ...overrides,
  };
}

function stageWith(elements: BGElement[] | null): StageData {
  return {
    name: "Training Room",
    author: "",
    bgDef: {
      spriteFile: "stage0.sff",
      localCoordWidth: 320,
      localCoordHeight: 240,
      zOffset: 0,
      zoomOut: 0,
      zoomIn: 0,
      modelFile: "",
      near: 0,
      far: 0,
      fov: 0,
      yShift: 0,
    },
    elements,
    cameraBounds: { left: 0, right: 0, high: 0, low: 0 },
    stageBoundaries: { left: 0, right: 0, topBound: 0, bottomBound: 0 },
    model: {
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      scaleX: 0,
      scaleY: 0,
      scaleZ: 0,
      environment: "",
      environmentIntensity: 0,
    },
    scaling: {
      depthToScreen: 0,
      topZ: 0,
      bottomZ: 0,
      topScale: 0,
      bottomScale: 0,
    },
    playerStartZ: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, p8: 0 },
  };
}

const oneSpriteGroup: SpriteGroup[] = [
  {
    index: 0,
    sprites: [
      {
        group: 0,
        image: 0,
        width: 57,
        height: 103,
        axisX: 25,
        axisY: 99,
        palette: 0,
      },
    ],
  },
];

describe("renderElementsEditor", () => {
  it("renders nothing when no stage is loaded", () => {
    const root = document.createElement("div");
    root.textContent = "placeholder";

    renderElementsEditor(root, null, null, {});

    expect(root.textContent).toBe("");
  });

  it("lists every element collapsed by default, with an add button", () => {
    const root = document.createElement("div");
    const stage = stageWith([
      element({ name: "sky" }),
      element({ name: "cloud" }),
    ]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});

    const rows = root.querySelectorAll(".elements-editor__row");
    expect(rows).toHaveLength(2);
    expect(
      root.querySelector(".elements-editor__body")?.hasAttribute("hidden"),
    ).toBe(true);
    expect(root.querySelector('[data-action="add-element"]')).not.toBeNull();
  });

  it("expands a row on toggle click, revealing its editable fields", () => {
    const root = document.createElement("div");
    const stage = stageWith([element()]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});

    const toggle = root.querySelector<HTMLButtonElement>(
      ".elements-editor__toggle",
    );
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const body = root.querySelector(".elements-editor__body");
    expect(body?.hasAttribute("hidden")).toBe(false);
    expect(root.querySelector('[data-field="startX"]')).not.toBeNull();
  });

  it("shows the sprite reference field for a normal element, not the action number field", () => {
    const root = document.createElement("div");
    const stage = stageWith([element({ type: "normal" })]);

    renderElementsEditor(root, stage, oneSpriteGroup, {
      expandedRows: new Set([0]),
    });

    expect(root.querySelector('[data-field="sprite"]')).not.toBeNull();
    expect(root.querySelector('[data-field="actionNumber"]')).toBeNull();
    expect(root.querySelector('[data-field="deltaX"]')).toBeNull();
  });

  it("shows delta fields for a parallax element", () => {
    const root = document.createElement("div");
    const stage = stageWith([element({ type: "parallax" })]);

    renderElementsEditor(root, stage, oneSpriteGroup, {
      expandedRows: new Set([0]),
    });

    expect(root.querySelector('[data-field="sprite"]')).not.toBeNull();
    expect(root.querySelector('[data-field="deltaX"]')).not.toBeNull();
  });

  it("shows the action number field for an anim element, not the sprite reference field", () => {
    const root = document.createElement("div");
    const stage = stageWith([element({ type: "anim", actionNumber: 42 })]);

    renderElementsEditor(root, stage, oneSpriteGroup, {
      expandedRows: new Set([0]),
    });

    expect(root.querySelector('[data-field="actionNumber"]')).not.toBeNull();
    expect(root.querySelector('[data-field="sprite"]')).toBeNull();
  });

  it("switching type preserves the previously entered action number in memory", () => {
    const root = document.createElement("div");
    const el = element({ type: "anim", actionNumber: 42 });
    const stage = stageWith([el]);
    const expandedRows = new Set([0]);

    renderElementsEditor(root, stage, oneSpriteGroup, { expandedRows });

    const typeSelect = root.querySelector<HTMLSelectElement>(
      '[data-field="type"]',
    );
    if (!typeSelect) throw new Error("no type select");
    typeSelect.value = "normal";
    typeSelect.dispatchEvent(new Event("change"));

    expect(el.type).toBe("normal");
    expect(el.actionNumber).toBe(42); // preserved, just not shown/used

    // Switch back to anim: the field reappears with the value intact.
    const typeSelect2 = root.querySelector<HTMLSelectElement>(
      '[data-field="type"]',
    );
    if (!typeSelect2) throw new Error("no type select");
    typeSelect2.value = "anim";
    typeSelect2.dispatchEvent(new Event("change"));

    expect(
      root.querySelector<HTMLInputElement>('[data-field="actionNumber"]')
        ?.value,
    ).toBe("42");
  });

  it("commits a plain numeric field edit on blur without collapsing other rows", () => {
    const root = document.createElement("div");
    const el = element();
    const stage = stageWith([el, element({ name: "cloud" })]);
    const onChange = vi.fn();

    renderElementsEditor(root, stage, oneSpriteGroup, {
      expandedRows: new Set([0, 1]),
      onChange,
    });

    const input = root.querySelector<HTMLInputElement>('[data-field="startX"]');
    if (!input) throw new Error("no startX input");
    input.value = "50";
    input.dispatchEvent(new Event("blur"));

    expect(el.startX).toBe(50);
    expect(onChange).toHaveBeenCalledTimes(1);
    // Both rows still present and still expanded (no structural rebuild collapsed anything).
    expect(root.querySelectorAll(".elements-editor__row")).toHaveLength(2);
  });

  it("flags a sprite reference absent from the loaded sheet as invalid", () => {
    const root = document.createElement("div");
    const stage = stageWith([element({ sprite: { group: 9, image: 9 } })]);

    renderElementsEditor(root, stage, oneSpriteGroup, {
      expandedRows: new Set([0]),
    });

    const select = root.querySelector<HTMLSelectElement>(
      '[data-field="sprite"]',
    );
    expect(select?.classList.contains("is-invalid")).toBe(true);
    expect(root.querySelector(".elements-editor__row")?.textContent).toMatch(
      /invalid/i,
    );
  });

  it("treats the unset (-1,-1) sprite reference as not-yet-assigned, not invalid", () => {
    const root = document.createElement("div");
    const stage = stageWith([element({ sprite: { group: -1, image: -1 } })]);

    renderElementsEditor(root, stage, oneSpriteGroup, {
      expandedRows: new Set([0]),
    });

    const select = root.querySelector<HTMLSelectElement>(
      '[data-field="sprite"]',
    );
    expect(select?.classList.contains("is-invalid")).toBe(false);
  });

  it("adds a new element with unset sprite reference, appended and auto-expanded", () => {
    const root = document.createElement("div");
    const stage = stageWith([element()]);
    const onChange = vi.fn();

    renderElementsEditor(root, stage, oneSpriteGroup, { onChange });

    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(stage.elements).toHaveLength(2);
    expect(stage.elements?.[1]?.sprite).toEqual({ group: -1, image: -1 });
    const rows = root.querySelectorAll(".elements-editor__row");
    expect(
      rows[1]?.querySelector(".elements-editor__body")?.hasAttribute("hidden"),
    ).toBe(false);
    expect(onChange).toHaveBeenCalled();
  });

  it("adds the first element even when elements starts out null", () => {
    const root = document.createElement("div");
    const stage = stageWith(null);

    renderElementsEditor(root, stage, oneSpriteGroup, {});

    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(stage.elements).toHaveLength(1);
  });

  it("removes an untouched, freshly-added element with a single click, no confirm", () => {
    const root = document.createElement("div");
    const stage = stageWith([]);
    renderElementsEditor(root, stage, oneSpriteGroup, {});
    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    root
      .querySelector<HTMLElement>('[data-action="remove-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(stage.elements).toHaveLength(0);
  });

  it("requires a confirm step to remove an element that has been edited", () => {
    const root = document.createElement("div");
    const el = element();
    const stage = stageWith([el]);
    renderElementsEditor(root, stage, oneSpriteGroup, {
      expandedRows: new Set([0]),
    });

    // Touch the element first.
    const input = root.querySelector<HTMLInputElement>('[data-field="startX"]');
    if (!input) throw new Error("no startX input");
    input.value = "10";
    input.dispatchEvent(new Event("blur"));

    root
      .querySelector<HTMLElement>('[data-action="remove-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Not removed yet — a confirm affordance appears instead.
    expect(stage.elements).toHaveLength(1);
    const confirmButton = root.querySelector<HTMLElement>(
      '[data-action="confirm-remove-element"]',
    );
    expect(confirmButton).not.toBeNull();

    confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(stage.elements).toHaveLength(0);
  });

  it("cancelling the remove confirm step leaves the element untouched", () => {
    const root = document.createElement("div");
    const el = element();
    const stage = stageWith([el]);
    renderElementsEditor(root, stage, oneSpriteGroup, {
      expandedRows: new Set([0]),
    });

    const input = root.querySelector<HTMLInputElement>('[data-field="startX"]');
    if (!input) throw new Error("no startX input");
    input.value = "10";
    input.dispatchEvent(new Event("blur"));

    root
      .querySelector<HTMLElement>('[data-action="remove-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    root
      .querySelector<HTMLElement>('[data-action="cancel-remove-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(stage.elements).toHaveLength(1);
    expect(stage.elements?.[0]?.startX).toBe(10);
  });
});

function checkboxes(root: HTMLElement): HTMLInputElement[] {
  return Array.from(root.querySelectorAll('[data-action="select-element"]'));
}

describe("renderElementsEditor — batch multi-select editing (item 007)", () => {
  it("renders no batch toolbar while nothing is selected", () => {
    const root = document.createElement("div");
    const stage = stageWith([element(), element()]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});

    expect(root.querySelector(".elements-editor__batch-toolbar")).toBeNull();
  });

  it("clicking a row's checkbox selects it and shows the batch toolbar with a count", () => {
    const root = document.createElement("div");
    const stage = stageWith([
      element({ name: "sky" }),
      element({ name: "cloud" }),
    ]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    const toolbar = root.querySelector(".elements-editor__batch-toolbar");
    expect(toolbar).not.toBeNull();
    expect(toolbar?.textContent).toContain("1 selected");
    expect(toolbar?.textContent).toContain("sky");
  });

  it("clicking a selected row's checkbox again deselects it", () => {
    const root = document.createElement("div");
    const stage = stageWith([element()]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});
    const checkbox = checkboxes(root)[0];
    checkbox.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    checkbox.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.querySelector(".elements-editor__batch-toolbar")).toBeNull();
  });

  it("shift-clicking a checkbox selects the contiguous range since the last individually-clicked row", () => {
    const root = document.createElement("div");
    const stage = stageWith([
      element({ name: "a" }),
      element({ name: "b" }),
      element({ name: "c" }),
      element({ name: "d" }),
      element({ name: "e" }),
    ]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});
    const boxes = checkboxes(root);
    boxes[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    boxes[3].dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true }),
    );

    const toolbar = root.querySelector(".elements-editor__batch-toolbar");
    expect(toolbar?.textContent).toContain("3 selected");
    expect(boxes[1].checked).toBe(true);
    expect(boxes[2].checked).toBe(true);
    expect(boxes[3].checked).toBe(true);
    expect(boxes[0].checked).toBe(false);
    expect(boxes[4].checked).toBe(false);
  });

  it("marks every selected row with a visual selected state", () => {
    const root = document.createElement("div");
    const stage = stageWith([element(), element()]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    const rows = root.querySelectorAll(".elements-editor__row");
    expect(rows[0].classList.contains("elements-editor__row--selected")).toBe(
      true,
    );
    expect(rows[1].classList.contains("elements-editor__row--selected")).toBe(
      false,
    );
  });

  it("Clear selection empties the selection and hides the toolbar", () => {
    const root = document.createElement("div");
    const stage = stageWith([element(), element()]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    root
      .querySelector<HTMLElement>('[data-action="clear-selection"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.querySelector(".elements-editor__batch-toolbar")).toBeNull();
    expect(checkboxes(root).every((c) => !c.checked)).toBe(true);
  });

  it("Apply offset is disabled until a non-zero delta is entered, then moves every selected element", () => {
    const root = document.createElement("div");
    const stage = stageWith([
      element({ name: "a", startX: 10, startY: 10 }),
      element({ name: "b", startX: 50, startY: 50 }),
      element({ name: "c", startX: 90, startY: 90 }),
    ]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    checkboxes(root)[2].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    const applyOffset = root.querySelector<HTMLButtonElement>(
      '[data-action="apply-offset"]',
    );
    expect(applyOffset?.hasAttribute("disabled")).toBe(true);

    const deltaX = root.querySelector<HTMLInputElement>(
      '[data-field="batch-delta-x"]',
    );
    if (!deltaX) throw new Error("no batch delta-x field");
    deltaX.value = "5";
    deltaX.dispatchEvent(new Event("input"));

    expect(applyOffset?.hasAttribute("disabled")).toBe(false);
    applyOffset?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(stage.elements?.[0].startX).toBe(15);
    expect(stage.elements?.[2].startX).toBe(95);
    // Untouched: not part of the selection.
    expect(stage.elements?.[1].startX).toBe(50);
  });

  it("applying a batch offset calls onChange", () => {
    const root = document.createElement("div");
    const stage = stageWith([element({ startX: 0, startY: 0 })]);
    const onChange = vi.fn();

    renderElementsEditor(root, stage, oneSpriteGroup, { onChange });
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    const deltaX = root.querySelector<HTMLInputElement>(
      '[data-field="batch-delta-x"]',
    );
    if (!deltaX) throw new Error("no batch delta-x field");
    deltaX.value = "1";
    deltaX.dispatchEvent(new Event("input"));
    root
      .querySelector<HTMLElement>('[data-action="apply-offset"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onChange).toHaveBeenCalled();
  });

  it("Apply sprite is disabled until a sprite is chosen, then reassigns every selected element", () => {
    const root = document.createElement("div");
    const stage = stageWith([
      element({ name: "a", sprite: { group: -1, image: -1 } }),
      element({ name: "b", sprite: { group: -1, image: -1 } }),
    ]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    checkboxes(root)[1].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    const applySprite = root.querySelector<HTMLButtonElement>(
      '[data-action="apply-sprite"]',
    );
    expect(applySprite?.hasAttribute("disabled")).toBe(true);

    const spriteSelect = root.querySelector<HTMLSelectElement>(
      '[data-field="batch-sprite"]',
    );
    if (!spriteSelect) throw new Error("no batch sprite field");
    spriteSelect.value = "0,0";
    spriteSelect.dispatchEvent(new Event("change"));

    expect(applySprite?.hasAttribute("disabled")).toBe(false);
    applySprite?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(stage.elements?.[0].sprite).toEqual({ group: 0, image: 0 });
    expect(stage.elements?.[1].sprite).toEqual({ group: 0, image: 0 });
  });

  it("applying a batch change to an empty selection is impossible from the UI (no toolbar, nothing to apply)", () => {
    const root = document.createElement("div");
    const stage = stageWith([element({ startX: 0 })]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});

    expect(root.querySelector('[data-action="apply-offset"]')).toBeNull();
    expect(root.querySelector('[data-action="apply-sprite"]')).toBeNull();
    expect(stage.elements?.[0].startX).toBe(0);
  });

  it("removing a selected row drops it from the selection without corrupting the rest", () => {
    const root = document.createElement("div");
    const el0 = element({ name: "a" });
    const el1 = element({ name: "b" });
    const stage = stageWith([el0, el1]);

    renderElementsEditor(root, stage, oneSpriteGroup, {
      expandedRows: new Set([0]),
    });
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    checkboxes(root)[1].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    root
      .querySelector<HTMLElement>('[data-action="remove-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(stage.elements).toHaveLength(1);
    expect(stage.elements?.[0].name).toBe("b");
    const toolbar = root.querySelector(".elements-editor__batch-toolbar");
    expect(toolbar?.textContent).toContain("1 selected");
  });

  it("a selection made before adding a new element still applies only to the originally selected rows", () => {
    const root = document.createElement("div");
    const stage = stageWith([element({ name: "a", startX: 0 })]);

    renderElementsEditor(root, stage, oneSpriteGroup, {});
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const deltaX = root.querySelector<HTMLInputElement>(
      '[data-field="batch-delta-x"]',
    );
    if (!deltaX) throw new Error("no batch delta-x field");
    deltaX.value = "7";
    deltaX.dispatchEvent(new Event("input"));
    root
      .querySelector<HTMLElement>('[data-action="apply-offset"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(stage.elements?.[0].startX).toBe(7);
    expect(stage.elements?.[1].startX).toBe(0); // the freshly added element, never selected
  });
});
