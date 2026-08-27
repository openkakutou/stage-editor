import { describe, expect, it, vi } from "vitest";
import type { StageDocument } from "../document/stage-document-store.ts";
import type { SaveResult, StageData } from "../wasm/types.ts";
import { renderSaveExport } from "./save-export.ts";

function stage(): StageData {
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
    elements: null,
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

function document_(overrides: Partial<StageDocument> = {}): StageDocument {
  const defBytes = new TextEncoder().encode("[Info]\nname = Training Room\n");
  return {
    fileName: "stage.def",
    relativePath: "pack/stage.def",
    stage: stage(),
    defBytes,
    sffFileName: "stage0.sff",
    sffRelativePath: "pack/stage0.sff",
    sffBytes: new Uint8Array(),
    ...overrides,
  };
}

describe("renderSaveExport", () => {
  it("renders a save button and an empty status", () => {
    const root = document.createElement("div");

    renderSaveExport(root, { getStageDocument: () => document_() });

    expect(root.querySelector('[data-action="save-export"]')).not.toBeNull();
    expect(root.querySelector(".save-export__status")?.textContent).toBe("");
  });

  it("saves the current document and triggers a download with the original filename, on success", async () => {
    const root = document.createElement("div");
    const doc = document_({ fileName: "arena.def" });
    const savedBytes = new TextEncoder().encode("[Info]\nname = Edited\n");
    const saveStage = vi
      .fn()
      .mockResolvedValue({ ok: true, bytes: savedBytes } as SaveResult);
    const triggerDownload = vi.fn();

    renderSaveExport(root, {
      getStageDocument: () => doc,
      saveStage,
      triggerDownload,
    });

    root
      .querySelector<HTMLElement>('[data-action="save-export"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(triggerDownload).toHaveBeenCalled();
    });

    expect(saveStage).toHaveBeenCalledWith(doc.defBytes, doc.stage, undefined);
    expect(triggerDownload).toHaveBeenCalledWith(savedBytes, "arena.def");
    expect(root.querySelector(".save-export__status")?.textContent).toMatch(
      /saved/i,
    );
  });

  it("shows a clear error state and never triggers a download when the WASM bridge reports a serialization failure", async () => {
    const root = document.createElement("div");
    const saveStage = vi.fn().mockResolvedValue({
      ok: false,
      error: "invalid in-memory stage",
    } as SaveResult);
    const triggerDownload = vi.fn();

    renderSaveExport(root, {
      getStageDocument: () => document_(),
      saveStage,
      triggerDownload,
    });

    root
      .querySelector<HTMLElement>('[data-action="save-export"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(root.querySelector(".save-export__status")?.textContent).not.toBe(
        "",
      );
    });

    expect(triggerDownload).not.toHaveBeenCalled();
    expect(root.querySelector(".save-export__status")?.textContent).toContain(
      "invalid in-memory stage",
    );
  });

  it("does nothing when clicked with no stage loaded", async () => {
    const root = document.createElement("div");
    const saveStage = vi.fn();
    const triggerDownload = vi.fn();

    renderSaveExport(root, {
      getStageDocument: () => null,
      saveStage,
      triggerDownload,
    });

    root
      .querySelector<HTMLElement>('[data-action="save-export"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(saveStage).not.toHaveBeenCalled();
    expect(triggerDownload).not.toHaveBeenCalled();
  });
});
