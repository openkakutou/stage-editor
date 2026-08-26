import { describe, expect, it, vi } from "vitest";
import type { StageData } from "../wasm/types.ts";
import { renderCharacteristicsEditor } from "./characteristics-editor.ts";

function stageWith(overrides: Partial<StageData> = {}): StageData {
  return {
    name: "Training Room",
    author: "Elecbyte",
    bgDef: {
      spriteFile: "stage0.sff",
      localCoordWidth: 320,
      localCoordHeight: 240,
      zOffset: 220,
      zoomOut: 0.75,
      zoomIn: 1.5,
      modelFile: "",
      near: 0,
      far: 0,
      fov: 0,
      yShift: 0,
    },
    elements: null,
    cameraBounds: { left: -180, right: 180, high: -240, low: 0 },
    stageBoundaries: { left: -1000, right: 1000, topBound: 0, bottomBound: 0 },
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
    ...overrides,
  };
}

function inputFor(root: HTMLElement, field: string): HTMLInputElement {
  const el = root.querySelector<HTMLInputElement>(`[data-field="${field}"]`);
  if (!el) throw new Error(`no input for field ${field}`);
  return el;
}

describe("renderCharacteristicsEditor", () => {
  it("pre-fills every field with the loaded stage's current values", () => {
    const root = document.createElement("div");
    const stage = stageWith();

    renderCharacteristicsEditor(root, stage, {});

    expect(inputFor(root, "name").value).toBe("Training Room");
    expect(inputFor(root, "author").value).toBe("Elecbyte");
    expect(inputFor(root, "cameraBounds.left").value).toBe("-180");
    expect(inputFor(root, "cameraBounds.high").value).toBe("-240");
    expect(inputFor(root, "stageBoundaries.topBound").value).toBe("0");
  });

  it("labels camera and boundary fields with their own context, not a bare direction", () => {
    const root = document.createElement("div");
    renderCharacteristicsEditor(root, stageWith(), {});

    const cameraLabel = root.querySelector(
      'label[for="characteristics-editor-cameraBounds.left"]',
    );
    const boundaryLabel = root.querySelector(
      'label[for="characteristics-editor-stageBoundaries.left"]',
    );
    expect(cameraLabel?.textContent).toMatch(/camera/i);
    expect(boundaryLabel?.textContent).toMatch(/boundary|stage/i);
    expect(cameraLabel?.textContent).not.toBe(boundaryLabel?.textContent);
  });

  it("commits a text field edit live, mutating the given stage object in place", () => {
    const root = document.createElement("div");
    const stage = stageWith();
    const onChange = vi.fn();

    renderCharacteristicsEditor(root, stage, { onChange });

    const input = inputFor(root, "author");
    input.value = "";
    input.dispatchEvent(new Event("input"));

    expect(stage.author).toBe("");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("commits a valid numeric field edit on blur, mutating the nested object in place", () => {
    const root = document.createElement("div");
    const stage = stageWith();
    const onChange = vi.fn();

    renderCharacteristicsEditor(root, stage, { onChange });

    const input = inputFor(root, "cameraBounds.left");
    input.value = "-200";
    input.dispatchEvent(new Event("blur"));

    expect(stage.cameraBounds.left).toBe(-200);
    // The unrelated stage-boundaries "left" field must stay untouched —
    // camera bounds and stage boundaries are distinct concepts even though
    // they share the same field name.
    expect(stage.stageBoundaries.left).toBe(-1000);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("flags an invalid numeric edit inline and withholds the commit", () => {
    const root = document.createElement("div");
    const stage = stageWith();
    const onChange = vi.fn();

    renderCharacteristicsEditor(root, stage, { onChange });

    const input = inputFor(root, "stageBoundaries.topBound");
    input.value = "not a number";
    input.dispatchEvent(new Event("blur"));

    expect(stage.stageBoundaries.topBound).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
