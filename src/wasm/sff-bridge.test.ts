import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { loadSpriteSheet, resetSffWasmBridgeForTests } from "./sff-bridge.ts";
import type { SffWasmBridgeOptions } from "./sff-bridge.ts";

// The real WASM assets (public/wasm/sff/, gitignored) are fetched via
// `npm run wasm:download:sff -- <version>` before tests run in this
// environment — a separate subdirectory from `stage`'s own assets, see
// .vibe/decisions/001-sff-wasm-bridged-directly-for-sprite-reference-validation.md.
const sffWasmDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "public",
  "wasm",
  "sff",
);
const testOptions: SffWasmBridgeOptions = {
  fetchWasmExecSource: async () =>
    readFileSync(path.join(sffWasmDir, "wasm_exec.js"), "utf-8"),
  fetchWasmBytes: async () =>
    new Uint8Array(readFileSync(path.join(sffWasmDir, "sff.wasm"))),
};

const testdataDir = path.resolve(import.meta.dirname, "testdata");
function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(testdataDir, name)));
}

// Wrapped in `new Uint8Array(...)`: under Vitest's jsdom environment,
// TextEncoder is a Node-realm polyfill, so its output otherwise fails
// jsdom-realm `instanceof Uint8Array` checks (including the WASM module's
// own argument validation) despite being a genuine byte buffer.
function textBytes(text: string): Uint8Array {
  return new Uint8Array(new TextEncoder().encode(text));
}

const sffBytes = fixture("v1-basic.sff");

beforeEach(() => {
  resetSffWasmBridgeForTests();
});

describe("loadSpriteSheet", () => {
  it("loads and instantiates the WASM module and returns typed sprite groups for valid input", async () => {
    const result = await loadSpriteSheet(sffBytes, testOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.spriteGroups).toEqual([
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
    ]);
  });

  it("returns a typed error instead of throwing when the bytes are malformed", async () => {
    const garbageBytes = textBytes("this is not a valid .sff file");

    const result = await loadSpriteSheet(garbageBytes, testOptions);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected an error result");
    expect(result.error.length).toBeGreaterThan(0);
  });

  it("returns a typed error instead of throwing for empty input", async () => {
    const result = await loadSpriteSheet(new Uint8Array(), testOptions);

    expect(result.ok).toBe(false);
  });
});
