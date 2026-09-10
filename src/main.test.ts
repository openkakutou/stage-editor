import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  commandStack,
  resetCommandStackForTests,
} from "./document/command-stack-store.ts";
import {
  getStageDocument,
  hasUnsavedStageChanges,
  resetStageDocumentForTests,
} from "./document/stage-document-store.ts";
import { initAppI18n } from "./i18n/i18n.ts";
import { renderApp } from "./main.ts";
import { appShortcutManager } from "./shortcuts/app-shortcut-manager.ts";
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
    expect(toolbar?.querySelector(".app-title")?.textContent).toBe(
      "Stage Editor — v0.1.0",
    );

    const main = shell?.querySelector("main");
    expect(main).not.toBeNull();
  });

  it("renders Undo and Redo controls in the toolbar, both disabled before anything is loaded", () => {
    resetCommandStackForTests();
    const root = document.createElement("div");

    renderApp(root, "0.1.0");

    const toolbar = root.querySelector('[slot="toolbar"]');
    const undo = toolbar?.querySelector('[data-action="undo"]');
    const redo = toolbar?.querySelector('[data-action="redo"]');
    expect(undo).not.toBeNull();
    expect(redo).not.toBeNull();
    expect(undo?.hasAttribute("disabled")).toBe(true);
    expect(redo?.hasAttribute("disabled")).toBe(true);
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
    expect(root.querySelector('[slot="toolbar"] .app-title')?.textContent).toBe(
      "Stage Editor — v0.2.0",
    );
  });

  it("renders without throwing and keeps a valid structure when given an empty version string", () => {
    const root = document.createElement("div");

    expect(() => renderApp(root, "")).not.toThrow();
    expect(root.querySelector('[slot="toolbar"] .app-title')?.textContent).toBe(
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

describe("renderApp — 3D model editor integration", () => {
  it("mounts the 3D model editor's always-visible fields once a stage is loaded", () => {
    resetStageDocumentForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");

    blankStageButton(root).click();

    expect(root.querySelector('[data-field="bgDef.near"]')).not.toBeNull();
    expect(root.querySelector('[data-field="playerStartZ.p1"]')).not.toBeNull();
  });
});

function undoButton(root: HTMLElement): HTMLElement {
  const button = root.querySelector<HTMLElement>('[data-action="undo"]');
  if (!button) throw new Error("undo button not found");
  return button;
}

function redoButton(root: HTMLElement): HTMLElement {
  const button = root.querySelector<HTMLElement>('[data-action="redo"]');
  if (!button) throw new Error("redo button not found");
  return button;
}

describe("renderApp — undo/redo integration (backlog item 008)", () => {
  it("editing the characteristics editor after creating a stage enables Undo; clicking it reverts the edit", () => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();

    expect(undoButton(root).hasAttribute("disabled")).toBe(true);

    const nameInput = root.querySelector<HTMLInputElement>(
      "#characteristics-editor-name",
    );
    if (!nameInput) throw new Error("no name input");
    nameInput.value = "Renamed";
    nameInput.dispatchEvent(new Event("input"));

    expect(getStageDocument()?.stage.name).toBe("Renamed");
    expect(undoButton(root).hasAttribute("disabled")).toBe(false);

    const originalName = "New Stage";
    undoButton(root).click();

    expect(getStageDocument()?.stage.name).toBe(originalName);
    expect(undoButton(root).hasAttribute("disabled")).toBe(true);
    expect(redoButton(root).hasAttribute("disabled")).toBe(false);
  });

  it("adding then removing a BG element are each undoable as their own step", () => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();

    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(getStageDocument()?.stage.elements).toHaveLength(1);

    undoButton(root).click();
    expect(getStageDocument()?.stage.elements).toHaveLength(0);
    expect(undoButton(root).hasAttribute("disabled")).toBe(true);

    redoButton(root).click();
    expect(getStageDocument()?.stage.elements).toHaveLength(1);
  });

  it("clears the undo history when a new stage document replaces the current one", () => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();

    const nameInput = root.querySelector<HTMLInputElement>(
      "#characteristics-editor-name",
    );
    if (!nameInput) throw new Error("no name input");
    nameInput.value = "Renamed";
    nameInput.dispatchEvent(new Event("input"));
    expect(commandStack.canUndo).toBe(true);

    const doc = getStageDocument();
    if (!doc) throw new Error("expected a document after creation");
    doc.stage.name = "Renamed"; // already dirty from the edit above

    // Discard the edited stage and start a fresh one — the discard
    // confirmation is accepted so creation actually proceeds.
    vi.spyOn(window, "confirm").mockReturnValue(true);
    blankStageButton(root).click();

    expect(commandStack.canUndo).toBe(false);
    expect(commandStack.canRedo).toBe(false);
    expect(undoButton(root).hasAttribute("disabled")).toBe(true);
    vi.restoreAllMocks();
  });
});

function checkboxes(root: HTMLElement): HTMLInputElement[] {
  return Array.from(root.querySelectorAll('[data-action="select-element"]'));
}

function dispatchShortcut(
  target: EventTarget,
  init: { key: string; ctrlKey?: boolean; shiftKey?: boolean },
): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: init.key,
      ctrlKey: init.ctrlKey ?? false,
      shiftKey: init.shiftKey ?? false,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe("renderApp — keyboard shortcuts wiring (backlog item 009)", () => {
  beforeEachResets();

  it("Ctrl+S triggers the same save/export flow as clicking the button", () => {
    // Suppresses jsdom's own "navigation not implemented" console noise
    // from the real (unmocked) WASM save's eventual `<a>` download click --
    // it settles asynchronously, after this test's own assertion already
    // ran, so the spy is deliberately never restored (this test's own
    // click, and any leftover async one, both land on it for the rest of
    // the suite). `renderApp` has no injection point for save-export's own
    // dependencies (that path is covered directly by save-export.test.ts),
    // so this test only asserts the synchronous "Saving…" status update,
    // never awaiting the async part.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    resetStageDocumentForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();

    dispatchShortcut(window, { key: "s", ctrlKey: true });

    // Set synchronously at the very top of the shared triggerSaveExport(),
    // before its own async WASM call resolves -- proves the shortcut ran
    // the exact same code path as a real click.
    expect(root.querySelector(".save-export__status")?.textContent).toBe(
      "Saving…",
    );
  });

  it("Ctrl+Z triggers Undo and Ctrl+Y triggers Redo on the shared toolbar controls", () => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();
    const nameInput = root.querySelector<HTMLInputElement>(
      "#characteristics-editor-name",
    );
    if (!nameInput) throw new Error("no name input");
    nameInput.value = "Renamed";
    nameInput.dispatchEvent(new Event("input"));
    expect(getStageDocument()?.stage.name).toBe("Renamed");

    dispatchShortcut(window, { key: "z", ctrlKey: true });
    expect(getStageDocument()?.stage.name).toBe("New Stage");

    dispatchShortcut(window, { key: "y", ctrlKey: true });
    expect(getStageDocument()?.stage.name).toBe("Renamed");
  });

  it("Ctrl+Z does not run the document Undo while focus is inside a text field, leaving native field-undo alone", () => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderApp(root, "0.1.0");
    blankStageButton(root).click();
    const nameInput = root.querySelector<HTMLInputElement>(
      "#characteristics-editor-name",
    );
    if (!nameInput) throw new Error("no name input");
    nameInput.value = "Renamed";
    nameInput.dispatchEvent(new Event("input"));

    dispatchShortcut(nameInput, { key: "z", ctrlKey: true });

    expect(getStageDocument()?.stage.name).toBe("Renamed");
    root.remove();
  });

  it("Ctrl+Shift+A triggers Add BG Element, the same as clicking the Add element button", () => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();

    dispatchShortcut(window, { key: "a", ctrlKey: true, shiftKey: true });

    expect(getStageDocument()?.stage.elements).toHaveLength(1);
  });

  it("Delete triggers Delete Selection for the currently selected BG elements", () => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();
    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(getStageDocument()?.stage.elements).toHaveLength(1);

    dispatchShortcut(window, { key: "Delete" });

    expect(getStageDocument()?.stage.elements).toHaveLength(0);
  });

  it("Delete does nothing while focus is inside a text field", () => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderApp(root, "0.1.0");
    blankStageButton(root).click();
    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    checkboxes(root)[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    const nameInput = root.querySelector<HTMLInputElement>(
      "#characteristics-editor-name",
    );
    if (!nameInput) throw new Error("no name input");

    dispatchShortcut(nameInput, { key: "Delete" });

    expect(getStageDocument()?.stage.elements).toHaveLength(1);
    root.remove();
  });

  it("does nothing for a key combo bound to no action", () => {
    resetStageDocumentForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");

    expect(() =>
      dispatchShortcut(window, { key: "k", ctrlKey: true }),
    ).not.toThrow();
  });

  it("does not accumulate keydown listeners across repeated renders", () => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();
    const nameInput = root.querySelector<HTMLInputElement>(
      "#characteristics-editor-name",
    );
    if (!nameInput) throw new Error("no name input");
    // Two edits of *different kinds* (a field commit, then a structural
    // add) deliberately, not two same-field edits — those would coalesce
    // into a single history entry regardless of listener count, which
    // would defeat what this test is actually checking.
    nameInput.value = "AAA";
    nameInput.dispatchEvent(new Event("input"));
    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(getStageDocument()?.stage.elements).toHaveLength(1);

    dispatchShortcut(window, { key: "z", ctrlKey: true });

    // A single Ctrl+Z should undo only the most recent action (adding the
    // element). If a stale listener from the first render were still
    // attached, this one keydown would fire the handler twice and undo
    // both actions in one press.
    expect(getStageDocument()?.stage.elements).toHaveLength(0);
    expect(getStageDocument()?.stage.name).toBe("AAA");
  });
});

describe("renderApp — shortcuts panel and discoverability (backlog item 009)", () => {
  beforeEachResets();

  it("mounts the shared shortcuts panel, fed this app's own manager", () => {
    resetStageDocumentForTests();
    const root = document.createElement("div");

    renderApp(root, "0.1.0");

    const panelEl = root.querySelector("wuik-shortcuts-panel");
    expect(panelEl).not.toBeNull();
    // biome-ignore lint/suspicious/noExplicitAny: reading a custom element's own JS property, not part of any typed DOM interface.
    expect((panelEl as any).manager).toBe(appShortcutManager);
  });

  it("shows each action's current shortcut on its own button as a title/aria-keyshortcuts hint", () => {
    resetStageDocumentForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();

    const saveExportButton = root.querySelector<HTMLElement>(
      '[data-action="save-export"]',
    );
    const toolbar = root.querySelector('[slot="toolbar"]');
    const undoButtonEl = toolbar?.querySelector<HTMLElement>(
      '[data-action="undo"]',
    );
    const addElementButton = root.querySelector<HTMLElement>(
      '[data-action="add-element"]',
    );
    expect(saveExportButton?.title).toBe("Save / Export (Ctrl+S)");
    expect(saveExportButton?.getAttribute("aria-keyshortcuts")).toBe("Ctrl+S");
    expect(undoButtonEl?.title).toBe("Undo (Ctrl+Z)");
    expect(addElementButton?.title).toBe("Add BG Element (Ctrl+Shift+A)");
  });

  it("updates a button's shortcut hint live when the shared manager rebinds its action", () => {
    resetStageDocumentForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();

    appShortcutManager.rebind("save-export", "Ctrl+E");

    const saveExportButton = root.querySelector<HTMLElement>(
      '[data-action="save-export"]',
    );
    expect(saveExportButton?.title).toBe("Save / Export (Ctrl+E)");
  });

  it("keeps the Add BG Element shortcut hint on the button across a structural rerender triggered by the editor's own internal action, not just the initial mount", () => {
    // Regression test: unlike Save/Export or Undo/Redo, the "Add element"
    // button is recreated by elements-editor.ts's own internal `rerender()`
    // closure on every structural change (add, remove, type switch, a
    // batch apply/delete) -- a path that bypasses `renderApp`'s own
    // `rerenderElements` wrapper entirely. A rebind that only ran from that
    // wrapper would leave the hint stale/empty after the very first such
    // action.
    resetStageDocumentForTests();
    resetCommandStackForTests();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");
    blankStageButton(root).click();

    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    root
      .querySelector<HTMLElement>('[data-action="add-element"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const addElementButton = root.querySelector<HTMLElement>(
      '[data-action="add-element"]',
    );
    expect(addElementButton?.title).toBe("Add BG Element (Ctrl+Shift+A)");
  });

  it("unsubscribes the previous render's toolbar button bindings from the shared manager before adding new ones", () => {
    resetStageDocumentForTests();
    const addSpy = vi.spyOn(appShortcutManager, "addEventListener");
    const removeSpy = vi.spyOn(appShortcutManager, "removeEventListener");
    const root = document.createElement("div");

    renderApp(root, "0.1.0");
    const addedByFirstRender = addSpy.mock.calls.length;
    const removedBeforeSecondRender = removeSpy.mock.calls.length;
    expect(addedByFirstRender).toBeGreaterThan(0);

    renderApp(root, "0.1.0");

    const removedBySecondRenderCleanup =
      removeSpy.mock.calls.length - removedBeforeSecondRender;
    expect(removedBySecondRenderCleanup).toBe(addedByFirstRender);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe("renderApp — live locale switching (backlog item 010)", () => {
  beforeEachResets();

  it("mounts a translated <wuik-locale-switcher> and retranslates the toolbar and editors on a locale change", async () => {
    const i18n = await initAppI18n();
    const root = document.createElement("div");
    renderApp(root, "0.1.0");

    const switcher = root.querySelector("wuik-locale-switcher");
    expect(switcher).not.toBeNull();
    expect(switcher?.getAttribute("label")).toBe("Language");

    blankStageButton(root).click();
    const nameLabel = root.querySelector(
      'label[for="characteristics-editor-name"]',
    );
    expect(nameLabel?.textContent).toBe("Name");

    await i18n.changeLanguage("fr");

    expect(switcher?.getAttribute("label")).toBe("Langue");
    expect(root.querySelector('[data-action="undo"]')?.textContent).toBe(
      "Annuler",
    );
    expect(root.querySelector('[data-action="redo"]')?.textContent).toBe(
      "Rétablir",
    );
    expect(
      root.querySelector('label[for="characteristics-editor-name"]')
        ?.textContent,
    ).toBe("Nom");
    expect(root.querySelector('[data-action="add-element"]')?.textContent).toBe(
      "Ajouter un élément",
    );
    expect(blankStageButton(root).textContent).toBe("Stage vierge");

    await i18n.changeLanguage("en");
  });
});

/** Shared `beforeEach` for the describe blocks above that need it -- a tiny local helper so it isn't repeated. */
function beforeEachResets(): void {
  beforeEach(() => {
    resetStageDocumentForTests();
    resetCommandStackForTests();
    // `appShortcutManager` is a real, long-lived singleton (persisted to the
    // real localStorage) -- reset any rebind a previous test may have left
    // behind so tests here don't leak into each other.
    for (const id of [
      "save-export",
      "undo",
      "redo",
      "add-element",
      "delete-selection",
    ]) {
      appShortcutManager.resetToDefault(id);
    }
    globalThis.localStorage.clear();
  });
}
