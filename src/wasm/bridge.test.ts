import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { loadStage, resetWasmBridgeForTests, saveStage } from "./bridge.ts";
import type { WasmBridgeOptions } from "./bridge.ts";

// The real WASM assets (public/wasm/, gitignored) are fetched via
// `npm run wasm:download -- <version>` before tests run in this
// environment. There is no running dev server under jsdom, so the fetch
// effects are injected as Node-backed stubs instead — see
// character-viewer-web's .vibe/decisions/002-wasm-bridge-loading-and-result-shape.md,
// whose loading strategy this bridge mirrors (via `stage-viewer-web`'s own
// read-only bridge).
const publicWasmDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "public",
  "wasm",
);
const testOptions: WasmBridgeOptions = {
  fetchWasmExecSource: async () =>
    readFileSync(path.join(publicWasmDir, "wasm_exec.js"), "utf-8"),
  fetchWasmBytes: async () =>
    new Uint8Array(readFileSync(path.join(publicWasmDir, "stage.wasm"))),
};

const testdataDir = path.resolve(import.meta.dirname, "testdata");
function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(testdataDir, name)));
}

const defBytes = fixture("sample.def");

beforeEach(() => {
  resetWasmBridgeForTests();
});

describe("loadStage", () => {
  it("loads and instantiates the WASM module and returns a typed stage for valid input", async () => {
    const result = await loadStage(defBytes, testOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");

    expect(result.stage.bgDef.spriteFile).toBe("stage0.sff");
    expect(result.stage.bgDef.zOffset).toBe(220);
    expect(result.stage.elements).toHaveLength(2);
  });

  it("returns a typed error, not a thrown exception, for malformed .def bytes", async () => {
    const malformed = new Uint8Array(
      new TextEncoder().encode("[BGDef\nspr = x\n"),
    );

    const result = await loadStage(malformed, testOptions);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error result");
    expect(result.error.length).toBeGreaterThan(0);
  });
});

describe("saveStage", () => {
  it("round-trips an unedited stage byte-exact to the original", async () => {
    const loaded = await loadStage(defBytes, testOptions);
    if (!loaded.ok) throw new Error("expected ok result");

    const result = await saveStage(defBytes, loaded.stage, testOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(new TextDecoder().decode(result.bytes)).toBe(
      new TextDecoder().decode(defBytes),
    );
  });

  it("reflects an edit in the produced .def bytes", async () => {
    const loaded = await loadStage(defBytes, testOptions);
    if (!loaded.ok) throw new Error("expected ok result");

    const edited = {
      ...loaded.stage,
      bgDef: { ...loaded.stage.bgDef, zOffset: 999 },
    };
    const result = await saveStage(defBytes, edited, testOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(new TextDecoder().decode(result.bytes)).toContain("zoffset = 999");
  });

  it("produces output for a brand new stage with no original bytes", async () => {
    const newStage = {
      bgDef: {
        spriteFile: "new.sff",
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
      elements: [],
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

    const result = await saveStage(new Uint8Array(0), newStage, testOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(new TextDecoder().decode(result.bytes)).toContain("new.sff");
  });

  it("returns a typed error, not a thrown exception, for a malformed original", async () => {
    // A non-empty original is re-parsed by `save` (to compare against the
    // edited value for the byte-exact-unchanged case) — a malformed
    // original is a real error path here, not just load's.
    const malformedOriginal = new Uint8Array(
      new TextEncoder().encode("[BGDef\nspr = x\n"),
    );
    const loaded = await loadStage(defBytes, testOptions);
    if (!loaded.ok) throw new Error("expected ok result");

    const result = await saveStage(
      malformedOriginal,
      loaded.stage,
      testOptions,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error result");
    expect(result.error.length).toBeGreaterThan(0);
  });

  it("still works on a later call after a prior save call errored", async () => {
    const loaded = await loadStage(defBytes, testOptions);
    if (!loaded.ok) throw new Error("expected ok result");

    const malformedOriginal = new Uint8Array(
      new TextEncoder().encode("[BGDef\nspr = x\n"),
    );
    const errorResult = await saveStage(
      malformedOriginal,
      loaded.stage,
      testOptions,
    );
    expect(errorResult.ok).toBe(false);

    const okResult = await saveStage(defBytes, loaded.stage, testOptions);
    expect(okResult.ok).toBe(true);
  });
});
