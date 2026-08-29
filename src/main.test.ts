import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  getStageDocument,
  hasUnsavedStageChanges,
  resetStageDocumentForTests,
} from "./document/stage-document-store.ts";
import { renderApp } from "./main.ts";
import { resetWasmBridgeForTests } from "./wasm/bridge.ts";
import type { WasmBridgeOptions } from "./wasm/bridge.ts";

const publicWasmDir = path.resolve(import.meta.dirname, "..", "public", "wasm");
const testBridgeOptions: WasmBridgeOptions = {
  fetchWasmExecSource: async () =>
    readFileSync(path.join(publicWasmDir, "wasm_exec.js"), "utf-8"),
  fetchWasmBytes: async () =>
    new Uint8Array(readFileSync(path.join(publicWasmDir, "stage.wasm"))),
};
const sampleDefText = readFileSync(
  path.resolve(import.meta.dirname, "wasm", "testdata", "sample.def"),
  "utf-8",
);

function withRelativePath(file: File, relativePath: string): File {
  Object.defineProperty(file, "webkitRelativePath", { value: relativePath });
  return file;
}

async function selectFolder(root: HTMLElement, files: File[]): Promise<void> {
  const input = root.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await vi.waitFor(() => {
    const status = root.querySelector('[role="status"]');
    if (status?.textContent?.includes("Reading"))
      throw new Error("still loading");
  });
}

describe("renderApp", () => {
  it("mounts a wuik-app-shell root frame with a toolbar title including the version", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0");

    const shell = root.querySelector("wuik-app-shell");
    expect(shell).not.toBeNull();

    const toolbar = shell?.querySelector('[slot="toolbar"]');
    expect(toolbar?.tagName.toLowerCase()).toBe("wuik-toolbar");
    expect(toolbar?.getAttribute("role")).toBe("banner");
    expect(toolbar?.textContent).toBe("Stage Editor — v0.1.0");

    const main = shell?.querySelector("main");
    expect(main).not.toBeNull();
  });

  it("renders the stage file input inside the main content area", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0");

    expect(root.querySelector('input[type="file"]')).not.toBeNull();
  });

  it("does not slot anything into the sidebar region", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0");

    expect(root.querySelector('[slot="sidebar"]')).toBeNull();
  });

  it("does not add any save/dirty-state affordance before real editing exists", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0");

    // No editing UI exists yet (later backlog items) — a disabled save
    // button or "unsaved changes" indicator here would be a permanently
    // non-functional control, not a useful signal.
    expect(root.querySelector('[class*="save"], [class*="dirty"]')).toBeNull();
  });

  it("replaces previous content instead of appending on repeated renders", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0");
    renderApp(root, "0.2.0");

    expect(root.querySelectorAll("wuik-app-shell")).toHaveLength(1);
    expect(root.querySelector('[slot="toolbar"]')?.textContent).toBe(
      "Stage Editor — v0.2.0",
    );
  });

  it("renders without throwing and keeps a valid structure when given an empty version string", () => {
    const root = document.createElement("div");

    expect(() => renderApp(root, "")).not.toThrow();
    expect(root.querySelector('[slot="toolbar"]')?.textContent).toBe(
      "Stage Editor — v",
    );
  });
});

describe("renderApp — stage document store integration", () => {
  it("stores a successfully loaded stage, ready for later editor screens", async () => {
    resetWasmBridgeForTests();
    resetStageDocumentForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0", { bridgeOptions: testBridgeOptions });

    await selectFolder(root, [
      withRelativePath(
        new File([sampleDefText], "stage.def"),
        "pack/stage.def",
      ),
      withRelativePath(
        new File(["sff-bytes"], "stage0.sff"),
        "pack/stage0.sff",
      ),
    ]);

    expect(getStageDocument()?.fileName).toBe("stage.def");
    expect(getStageDocument()?.sffFileName).toBe("stage0.sff");
  });

  it("fully replaces the stored stage on a second load, with no leftover from the first", async () => {
    resetWasmBridgeForTests();
    resetStageDocumentForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0", { bridgeOptions: testBridgeOptions });

    await selectFolder(root, [
      withRelativePath(new File([sampleDefText], "stage.def"), "a/stage.def"),
      withRelativePath(new File(["sff-bytes"], "stage0.sff"), "a/stage0.sff"),
    ]);
    expect(getStageDocument()?.relativePath).toBe("a/stage.def");

    await selectFolder(root, [
      withRelativePath(new File([sampleDefText], "other.def"), "b/other.def"),
      withRelativePath(new File(["sff-bytes"], "stage0.sff"), "b/stage0.sff"),
    ]);

    const current = getStageDocument();
    expect(current?.fileName).toBe("other.def");
    expect(current?.relativePath).toBe("b/other.def");
  });
});

function blankStageButton(root: HTMLElement): HTMLElement {
  const button = root.querySelector<HTMLElement>(
    '[data-action="new-stage-blank"]',
  );
  if (!button) throw new Error("blank stage button not found");
  return button;
}

describe("renderApp — New Stage Wizard integration", () => {
  it("renders the New Stage Wizard alongside the file input from the start", () => {
    resetStageDocumentForTests();
    const root = document.createElement("div");

    renderApp(root, "0.1.0");

    expect(blankStageButton(root)).not.toBeNull();
    expect(root.querySelector('input[type="file"]')).not.toBeNull();
  });

  it("creating a blank stage stores it and mounts the characteristics editor, with no file ever loaded", () => {
    resetStageDocumentForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");

    blankStageButton(root).click();

    expect(getStageDocument()?.stage.elements).toEqual([]);
    expect(root.querySelector("#characteristics-editor-name")).not.toBeNull();
  });

  it("moves focus into the characteristics editor after creating a blank stage", () => {
    resetStageDocumentForTests();
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderApp(root, "0.1.0");

    blankStageButton(root).click();

    expect(document.activeElement?.id).toBe("characteristics-editor-name");
    root.remove();
  });

  it("prompts before discarding an edited stage, and does nothing when declined", () => {
    resetStageDocumentForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();
    const doc = getStageDocument();
    if (!doc) throw new Error("expected a document after creation");
    doc.stage.name = "Edited";
    expect(hasUnsavedStageChanges()).toBe(true);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    blankStageButton(root).click();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(getStageDocument()?.stage.name).toBe("Edited");
    confirmSpy.mockRestore();
  });
});
