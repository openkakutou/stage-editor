import { describe, expect, it, vi } from "vitest";
import type { StageDocument } from "../document/stage-document-store.ts";
import { initAppI18n } from "../i18n/i18n.ts";
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

  it("marks the document as saved (clearing unsaved-changes tracking) on a successful save", async () => {
    const root = document.createElement("div");
    const saveStage = vi
      .fn()
      .mockResolvedValue({ ok: true, bytes: new Uint8Array() } as SaveResult);
    const markStageDocumentSaved = vi.fn();

    renderSaveExport(root, {
      getStageDocument: () => document_(),
      saveStage,
      triggerDownload: vi.fn(),
      markStageDocumentSaved,
    });

    root
      .querySelector<HTMLElement>('[data-action="save-export"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(markStageDocumentSaved).toHaveBeenCalled();
    });
  });

  it("does not mark the document as saved when the save fails", async () => {
    const root = document.createElement("div");
    const saveStage = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "bad stage" } as SaveResult);
    const markStageDocumentSaved = vi.fn();

    renderSaveExport(root, {
      getStageDocument: () => document_(),
      saveStage,
      triggerDownload: vi.fn(),
      markStageDocumentSaved,
    });

    root
      .querySelector<HTMLElement>('[data-action="save-export"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(root.querySelector(".save-export__status")?.textContent).toBe(
        "bad stage",
      );
    });

    expect(markStageDocumentSaved).not.toHaveBeenCalled();
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

describe("renderSaveExport — trigger handle for the keyboard shortcut dispatcher (item 009)", () => {
  it("returns a handle exposing the rendered button", () => {
    const root = document.createElement("div");

    const handle = renderSaveExport(root, {
      getStageDocument: () => document_(),
    });

    expect(handle.button).toBe(
      root.querySelector('[data-action="save-export"]'),
    );
  });

  it("triggerSaveExport() does the exact same thing as clicking the button", async () => {
    const root = document.createElement("div");
    const saveStage = vi
      .fn()
      .mockResolvedValue({ ok: true, bytes: new Uint8Array() } as SaveResult);
    const triggerDownload = vi.fn();

    const handle = renderSaveExport(root, {
      getStageDocument: () => document_({ fileName: "arena.def" }),
      saveStage,
      triggerDownload,
    });
    handle.triggerSaveExport();

    await vi.waitFor(() => {
      expect(triggerDownload).toHaveBeenCalled();
    });
    expect(triggerDownload.mock.calls[0][1]).toBe("arena.def");
  });

  it("triggerSaveExport() does nothing when no stage is loaded", () => {
    const root = document.createElement("div");
    const saveStage = vi.fn();

    const handle = renderSaveExport(root, {
      getStageDocument: () => null,
      saveStage,
    });

    expect(() => handle.triggerSaveExport()).not.toThrow();
    expect(saveStage).not.toHaveBeenCalled();
  });
});

describe("renderSaveExport — live locale switching (backlog item 010)", () => {
  it("retranslates the button and the already-shown 'saved' status in place on a locale change", async () => {
    const root = document.createElement("div");
    const i18n = await initAppI18n();
    const saveStage = vi
      .fn()
      .mockResolvedValue({ ok: true, bytes: new Uint8Array() } as SaveResult);

    const handle = renderSaveExport(root, {
      getStageDocument: () => document_({ fileName: "arena.def" }),
      saveStage,
      triggerDownload: vi.fn(),
    });
    handle.triggerSaveExport();
    await vi.waitFor(() => {
      expect(root.querySelector(".save-export__status")?.textContent).toBe(
        "Saved arena.def.",
      );
    });

    await i18n.changeLanguage("fr");

    expect(handle.button.textContent).toBe("Enregistrer / Exporter");
    expect(root.querySelector(".save-export__status")?.textContent).toBe(
      "arena.def enregistré.",
    );

    handle.unsubscribeLocale();
    await i18n.changeLanguage("en");
  });
});
