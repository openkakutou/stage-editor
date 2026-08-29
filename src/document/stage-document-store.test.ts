import { beforeEach, describe, expect, it } from "vitest";
import type { StageData } from "../wasm/types.ts";
import {
  getStageDocument,
  hasUnsavedStageChanges,
  markStageDocumentSaved,
  resetStageDocumentForTests,
  setStageDocument,
} from "./stage-document-store.ts";

function emptyStage(spriteFile = "stage0.sff"): StageData {
  return {
    name: "",
    author: "",
    bgDef: {
      spriteFile,
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

function loaded(fileName: string, spriteFile = "stage0.sff") {
  return {
    fileName,
    relativePath: fileName,
    stage: emptyStage(spriteFile),
    defBytes: new Uint8Array([1]),
    sffFileName: spriteFile,
    sffRelativePath: spriteFile,
    sffBytes: new Uint8Array([2]),
  };
}

beforeEach(() => {
  resetStageDocumentForTests();
});

describe("getStageDocument", () => {
  it("is null before any folder has been loaded", () => {
    expect(getStageDocument()).toBeNull();
  });
});

describe("setStageDocument / getStageDocument", () => {
  it("returns the exact document just set", () => {
    const doc = loaded("stage.def");

    setStageDocument(doc);

    expect(getStageDocument()).toEqual(doc);
  });

  it("replaces a previously loaded document rather than merging into it, with no confirmation needed", () => {
    setStageDocument(loaded("first.def", "first.sff"));
    setStageDocument(loaded("second.def", "second.sff"));

    const current = getStageDocument();
    expect(current?.fileName).toBe("second.def");
    expect(current?.sffFileName).toBe("second.sff");
  });

  it("clears the document when set back to null", () => {
    setStageDocument(loaded("stage.def"));

    setStageDocument(null);

    expect(getStageDocument()).toBeNull();
  });
});

describe("resetStageDocumentForTests", () => {
  it("clears a previously loaded document back to null", () => {
    setStageDocument(loaded("stage.def"));

    resetStageDocumentForTests();

    expect(getStageDocument()).toBeNull();
  });
});

describe("hasUnsavedStageChanges", () => {
  it("is false when nothing is loaded", () => {
    expect(hasUnsavedStageChanges()).toBe(false);
  });

  it("is false right after loading a document, before any edit", () => {
    setStageDocument(loaded("stage.def"));

    expect(hasUnsavedStageChanges()).toBe(false);
  });

  it("becomes true once the loaded stage object is mutated in place", () => {
    setStageDocument(loaded("stage.def"));
    const doc = getStageDocument();
    if (!doc) throw new Error("expected a loaded document");

    doc.stage.name = "Edited Name";

    expect(hasUnsavedStageChanges()).toBe(true);
  });

  it("is false again once the edited value is reverted back to its original", () => {
    setStageDocument(loaded("stage.def"));
    const doc = getStageDocument();
    if (!doc) throw new Error("expected a loaded document");
    const originalName = doc.stage.name;

    doc.stage.name = "Edited Name";
    expect(hasUnsavedStageChanges()).toBe(true);
    doc.stage.name = originalName;

    expect(hasUnsavedStageChanges()).toBe(false);
  });

  it("resets to false after markStageDocumentSaved, even though the same edited object is still loaded", () => {
    setStageDocument(loaded("stage.def"));
    const doc = getStageDocument();
    if (!doc) throw new Error("expected a loaded document");
    doc.stage.name = "Edited Name";
    expect(hasUnsavedStageChanges()).toBe(true);

    markStageDocumentSaved();

    expect(hasUnsavedStageChanges()).toBe(false);
  });

  it("resets to false once a brand new document replaces the edited one", () => {
    setStageDocument(loaded("first.def"));
    const doc = getStageDocument();
    if (!doc) throw new Error("expected a loaded document");
    doc.stage.name = "Edited Name";

    setStageDocument(loaded("second.def"));

    expect(hasUnsavedStageChanges()).toBe(false);
  });
});
