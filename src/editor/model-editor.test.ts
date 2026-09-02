import { describe, expect, it, vi } from "vitest";
import type { BGdef, Model, StageData } from "../wasm/types.ts";
import { renderModelEditor } from "./model-editor.ts";
import type { ModelPreviewHandle } from "./model-preview.ts";

function bgDef(overrides: Partial<BGdef> = {}): BGdef {
  return {
    spriteFile: "stage0.sff",
    localCoordWidth: 320,
    localCoordHeight: 240,
    zOffset: 0,
    zoomOut: 1,
    zoomIn: 1,
    modelFile: "",
    near: 0,
    far: 0,
    fov: 0,
    yShift: 0,
    ...overrides,
  };
}

function model(overrides: Partial<Model> = {}): Model {
  return {
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    environment: "",
    environmentIntensity: 1,
    ...overrides,
  };
}

function stage(overrides: Partial<StageData> = {}): StageData {
  return {
    name: "",
    author: "",
    bgDef: bgDef(),
    elements: null,
    cameraBounds: { left: 0, right: 0, high: 0, low: 0 },
    stageBoundaries: { left: 0, right: 0, topBound: 0, bottomBound: 0 },
    model: model(),
    scaling: {
      depthToScreen: 1,
      topZ: 0,
      bottomZ: 0,
      topScale: 1,
      bottomScale: 1,
    },
    playerStartZ: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, p8: 0 },
    ...overrides,
  };
}

function fakeHandle(): ModelPreviewHandle {
  return { updateTransform: vi.fn(), updateCamera: vi.fn() };
}

/** Injects a fake `renderPreview` so these tests never touch real three.js/WebGL. */
function fakeRenderPreview() {
  const handles: ModelPreviewHandle[] = [];
  const calls: unknown[] = [];
  const fn = vi.fn((_root, input, transform, camera) => {
    calls.push({ input, transform, camera });
    const handle = fakeHandle();
    handles.push(handle);
    return handle;
  });
  return { fn, handles, calls };
}

function selectFile(dropZone: Element, file: File): void {
  dropZone.dispatchEvent(
    new CustomEvent("wuik-files-selected", { detail: { files: [file] } }),
  );
}

function blur(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event("blur"));
}

describe("renderModelEditor — always-visible fields", () => {
  it("renders Camera/Scaling/PlayerStartZ fields pre-filled from the stage, with no model assigned", () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    renderModelEditor(
      root,
      stage({
        bgDef: bgDef({ near: 1, far: 5000, fov: 60, yShift: 3 }),
        scaling: {
          depthToScreen: 2,
          topZ: 10,
          bottomZ: -10,
          topScale: 1.5,
          bottomScale: 0.5,
        },
        playerStartZ: {
          p1: 1,
          p2: 2,
          p3: 3,
          p4: 4,
          p5: 5,
          p6: 6,
          p7: 7,
          p8: 8,
        },
      }),
      { renderPreview: preview.fn },
    );

    const near = root.querySelector<HTMLInputElement>(
      '[data-field="bgDef.near"]',
    );
    expect(near?.value).toBe("1");
    const topScale = root.querySelector<HTMLInputElement>(
      '[data-field="scaling.topScale"]',
    );
    expect(topScale?.value).toBe("1.5");
    const p5 = root.querySelector<HTMLInputElement>(
      '[data-field="playerStartZ.p5"]',
    );
    expect(p5?.value).toBe("5");

    // Model-only fields (Offset/Scale/Environment Intensity) are hidden
    // while no model is assigned.
    expect(root.querySelector('[data-field="model.offsetX"]')).toBeNull();
  });

  it("commits a Camera Near edit on blur and updates the stage", () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage();
    const onChange = vi.fn();
    renderModelEditor(root, loadedStage, {
      renderPreview: preview.fn,
      onChange,
    });

    const near = root.querySelector<HTMLInputElement>(
      '[data-field="bgDef.near"]',
    );
    expect(near).not.toBeNull();
    blur(near as HTMLInputElement, "2.5");

    expect(loadedStage.bgDef.near).toBe(2.5);
    expect(onChange).toHaveBeenCalled();
  });

  it("shows an invalid state and does not commit when a numeric field is blurred with a non-numeric value", () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage({ bgDef: bgDef({ near: 1 }) });
    renderModelEditor(root, loadedStage, { renderPreview: preview.fn });

    const near = root.querySelector<HTMLInputElement>(
      '[data-field="bgDef.near"]',
    );
    blur(near as HTMLInputElement, "not-a-number");

    expect(loadedStage.bgDef.near).toBe(1);
    expect(near?.classList.contains("is-invalid")).toBe(true);
  });

  it("commits a Camera Near/Far/fov edit into the live preview's updateCamera, without remounting", () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage({
      bgDef: bgDef({ modelFile: "stage.glb", near: 1, far: 5000, fov: 60 }),
    });
    renderModelEditor(root, loadedStage, { renderPreview: preview.fn });
    expect(preview.fn).toHaveBeenCalledTimes(1);
    const handle = preview.handles[0];

    const near = root.querySelector<HTMLInputElement>(
      '[data-field="bgDef.near"]',
    );
    blur(near as HTMLInputElement, "2");

    expect(handle.updateCamera).toHaveBeenCalledWith({
      fov: 60,
      near: 2,
      far: 5000,
    });
    expect(preview.fn).toHaveBeenCalledTimes(1); // no remount
  });

  it("commits a Camera Y Shift edit without touching the preview", () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage({ bgDef: bgDef({ modelFile: "stage.glb" }) });
    renderModelEditor(root, loadedStage, { renderPreview: preview.fn });
    const handle = preview.handles[0];

    const yShift = root.querySelector<HTMLInputElement>(
      '[data-field="bgDef.yShift"]',
    );
    blur(yShift as HTMLInputElement, "7");

    expect(loadedStage.bgDef.yShift).toBe(7);
    expect(handle.updateCamera).not.toHaveBeenCalled();
  });

  it("commits a Scaling or PlayerStartZ edit without touching the preview", () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage({ bgDef: bgDef({ modelFile: "stage.glb" }) });
    renderModelEditor(root, loadedStage, { renderPreview: preview.fn });
    const handle = preview.handles[0];

    const topZ = root.querySelector<HTMLInputElement>(
      '[data-field="scaling.topZ"]',
    );
    blur(topZ as HTMLInputElement, "42");
    const p3 = root.querySelector<HTMLInputElement>(
      '[data-field="playerStartZ.p3"]',
    );
    blur(p3 as HTMLInputElement, "9");

    expect(loadedStage.scaling.topZ).toBe(42);
    expect(loadedStage.playerStartZ.p3).toBe(9);
    expect(handle.updateTransform).not.toHaveBeenCalled();
    expect(handle.updateCamera).not.toHaveBeenCalled();
  });
});

describe("renderModelEditor — model file assignment", () => {
  it("shows a neutral re-select notice when the stage already references a model that hasn't been picked this session", () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    renderModelEditor(
      root,
      stage({ bgDef: bgDef({ modelFile: "hero-stage.glb" }) }),
      { renderPreview: preview.fn },
    );

    const reference = root.querySelector(".model-editor__asset-reference");
    expect(reference?.textContent).toContain("hero-stage.glb");
    expect(reference?.textContent?.toLowerCase()).toContain("select");
    expect(reference?.textContent?.toLowerCase()).not.toContain("error");
  });

  it("assigning a model file reads its bytes, sets the reference, remounts the preview, and reveals placement fields", async () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage();
    const readFileBytes = vi.fn().mockResolvedValue(new Uint8Array([1, 2]));
    const onChange = vi.fn();
    renderModelEditor(root, loadedStage, {
      renderPreview: preview.fn,
      readFileBytes,
      onChange,
    });

    const dropZone = root.querySelector(
      ".model-editor__model .model-editor__drop-zone",
    ) as Element;
    const file = new File(["x"], "hero-stage.glb");
    selectFile(dropZone, file);
    await vi.waitFor(() => {
      expect(readFileBytes).toHaveBeenCalledWith(file);
    });

    expect(loadedStage.bgDef.modelFile).toBe("hero-stage.glb");
    expect(onChange).toHaveBeenCalled();
    // A structural change (assign) does remount the preview: called once at
    // mount (input null) and once more with the newly assigned bytes.
    expect(preview.fn).toHaveBeenCalledTimes(2);
    expect(preview.calls[1]).toMatchObject({
      input: { modelBytes: new Uint8Array([1, 2]), environmentBytes: null },
    });
  });

  it("reveals Offset/Scale/Environment Intensity fields only after a model is assigned this session", async () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage();
    const readFileBytes = vi.fn().mockResolvedValue(new Uint8Array([1]));
    renderModelEditor(root, loadedStage, {
      renderPreview: preview.fn,
      readFileBytes,
    });
    expect(root.querySelector('[data-field="model.offsetX"]')).toBeNull();

    const dropZone = root.querySelector(
      ".model-editor__model .model-editor__drop-zone",
    ) as Element;
    selectFile(dropZone, new File(["x"], "hero-stage.glb"));
    await vi.waitFor(() => {
      expect(root.querySelector('[data-field="model.offsetX"]')).not.toBeNull();
    });
  });

  it("committing an Offset/Scale edit pushes into the live preview's updateTransform, without remounting", async () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage();
    const readFileBytes = vi.fn().mockResolvedValue(new Uint8Array([1]));
    renderModelEditor(root, loadedStage, {
      renderPreview: preview.fn,
      readFileBytes,
    });
    const dropZone = root.querySelector(
      ".model-editor__model .model-editor__drop-zone",
    ) as Element;
    selectFile(dropZone, new File(["x"], "hero-stage.glb"));
    await vi.waitFor(() => {
      expect(preview.fn).toHaveBeenCalledTimes(2);
    });
    const handle = preview.handles[1];
    const callsAfterAssign = preview.fn.mock.calls.length;

    const offsetX = root.querySelector<HTMLInputElement>(
      '[data-field="model.offsetX"]',
    );
    blur(offsetX as HTMLInputElement, "5");

    expect(loadedStage.model.offsetX).toBe(5);
    expect(handle.updateTransform).toHaveBeenCalledWith({
      position: [5, 0, 0],
      scale: [1, 1, 1],
    });
    expect(preview.fn).toHaveBeenCalledTimes(callsAfterAssign); // no remount
  });

  it("removing an assigned model requires an inline confirm step, then clears only the reference", async () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage({
      bgDef: bgDef({ modelFile: "hero-stage.glb" }),
      model: model({ offsetX: 9 }),
    });
    renderModelEditor(root, loadedStage, { renderPreview: preview.fn });

    const removeButton = root.querySelector<HTMLElement>(
      '.model-editor__model [data-action="remove-model"]',
    );
    expect(removeButton).not.toBeNull();
    removeButton?.dispatchEvent(new MouseEvent("click"));

    const confirmPrompt = root.querySelector(
      ".model-editor__remove-confirm-prompt",
    );
    expect(confirmPrompt?.textContent).toContain("Remove this model?");
    // Not removed yet — requires the explicit confirm click.
    expect(loadedStage.bgDef.modelFile).toBe("hero-stage.glb");

    const confirmButton = root.querySelector<HTMLElement>(
      '.model-editor__model [data-action="confirm-remove-model"]',
    );
    confirmButton?.dispatchEvent(new MouseEvent("click"));

    expect(loadedStage.bgDef.modelFile).toBe("");
    // Placement values are preserved, per .vibe/decisions/004 point 3.
    expect(loadedStage.model.offsetX).toBe(9);
  });

  it("cancelling a remove leaves the reference untouched", () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage({
      bgDef: bgDef({ modelFile: "hero-stage.glb" }),
    });
    renderModelEditor(root, loadedStage, { renderPreview: preview.fn });

    const removeButton = root.querySelector<HTMLElement>(
      '.model-editor__model [data-action="remove-model"]',
    );
    removeButton?.dispatchEvent(new MouseEvent("click"));
    const cancelButton = root.querySelector<HTMLElement>(
      '.model-editor__model [data-action="cancel-remove-model"]',
    );
    cancelButton?.dispatchEvent(new MouseEvent("click"));

    expect(loadedStage.bgDef.modelFile).toBe("hero-stage.glb");
    expect(
      root.querySelector('.model-editor__model [data-action="remove-model"]'),
    ).not.toBeNull();
  });
});

describe("renderModelEditor — lighting (.hdr) assignment", () => {
  it("assigning a lighting file sets the reference and remounts the preview with the environment bytes", async () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage({
      bgDef: bgDef({ modelFile: "hero-stage.glb" }),
    });
    const readFileBytes = vi
      .fn()
      .mockResolvedValueOnce(new Uint8Array([1]))
      .mockResolvedValueOnce(new Uint8Array([2]));
    renderModelEditor(root, loadedStage, {
      renderPreview: preview.fn,
      readFileBytes,
    });

    const modelDropZone = root.querySelector(
      ".model-editor__model .model-editor__drop-zone",
    ) as Element;
    selectFile(modelDropZone, new File(["x"], "hero-stage.glb"));
    await vi.waitFor(() => expect(preview.fn).toHaveBeenCalledTimes(2));

    const envDropZone = root.querySelector(
      ".model-editor__environment .model-editor__drop-zone",
    ) as Element;
    selectFile(envDropZone, new File(["y"], "sunset.hdr"));
    await vi.waitFor(() => {
      expect(loadedStage.model.environment).toBe("sunset.hdr");
    });
    expect(preview.fn).toHaveBeenCalledTimes(3);
    expect(preview.calls[2]).toMatchObject({
      input: {
        modelBytes: new Uint8Array([1]),
        environmentBytes: new Uint8Array([2]),
      },
    });
  });

  it("removing a lighting file requires an inline confirm step, then clears only its reference", () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const loadedStage = stage({
      bgDef: bgDef({ modelFile: "hero-stage.glb" }),
      model: model({ environment: "sunset.hdr" }),
    });
    renderModelEditor(root, loadedStage, { renderPreview: preview.fn });

    const removeButton = root.querySelector<HTMLElement>(
      '.model-editor__environment [data-action="remove-lighting-file"]',
    );
    removeButton?.dispatchEvent(new MouseEvent("click"));
    const confirmButton = root.querySelector<HTMLElement>(
      '.model-editor__environment [data-action="confirm-remove-lighting-file"]',
    );
    confirmButton?.dispatchEvent(new MouseEvent("click"));

    expect(loadedStage.model.environment).toBe("");
  });
});

describe("renderModelEditor — switching documents on the same root", () => {
  it("discards the previous document's session and starts fresh when called again with a different stage", async () => {
    const root = document.createElement("div");
    const preview = fakeRenderPreview();
    const firstStage = stage({ bgDef: bgDef({ modelFile: "first.glb" }) });
    renderModelEditor(root, firstStage, { renderPreview: preview.fn });
    expect(preview.fn).toHaveBeenCalledTimes(1);

    const secondStage = stage();
    renderModelEditor(root, secondStage, { renderPreview: preview.fn });

    // Torn down the first session's preview (input null) and mounted a
    // fresh one for the new, unrelated document.
    expect(preview.fn).toHaveBeenCalledTimes(3);
    expect(preview.calls[1]).toMatchObject({ input: null });
    expect(preview.calls[2]).toMatchObject({ input: null });
    expect(root.querySelector(".model-editor__asset-reference")).toBeNull();
  });
});
