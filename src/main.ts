import "@openkakutou/web-ui-kit/tokens.css";
import "@openkakutou/web-ui-kit";
import "./style.css";
import type {
  Command,
  WuikLocaleSwitcherElement,
  WuikShortcutsPanelElement,
} from "@openkakutou/web-ui-kit";
import { commandStack } from "./document/command-stack-store.ts";
import type { StageDocument } from "./document/stage-document-store.ts";
import {
  getStageDocument,
  setStageDocument,
} from "./document/stage-document-store.ts";
import { renderCharacteristicsEditor } from "./editor/characteristics-editor.ts";
import type { ElementsEditorHandle } from "./editor/elements-editor.ts";
import { renderElementsEditor } from "./editor/elements-editor.ts";
import { renderModelEditor } from "./editor/model-editor.ts";
import type { SaveExportHandle } from "./editor/save-export.ts";
import { renderSaveExport } from "./editor/save-export.ts";
import { renderUndoRedoControls } from "./editor/undo-redo-controls.ts";
import { getI18n, initAppI18n, onLocaleChange, t } from "./i18n/i18n.ts";
import { renderStageFileInput } from "./input/stage-file-input-view.ts";
import type { StageFolderInputOptions } from "./input/stage-file-input.ts";
import { appShortcutManager } from "./shortcuts/app-shortcut-manager.ts";
import { handleAppShortcutKeydown } from "./shortcuts/app-shortcuts.ts";
import {
  bindShortcutLabel,
  formatShortcutTitle,
} from "./shortcuts/shortcut-label.ts";
import { renderShortcutsPanelSection } from "./shortcuts/shortcuts-panel-section.ts";
import { appVersion } from "./version.ts";
import type { SffWasmBridgeOptions } from "./wasm/sff-bridge.ts";
import { loadSpriteSheet } from "./wasm/sff-bridge.ts";
import type { SpriteGroup } from "./wasm/sff-types.ts";
import type { BGElement } from "./wasm/types.ts";
import { renderNewStageWizard } from "./wizard/new-stage-wizard.ts";

// The app's own brand name -- a proper noun, deliberately never translated,
// same convention as every sibling OpenKakutou app. See
// .vibe/decisions/008-i18n-integration-approach.md.
const APP_TITLE = "Stage Editor";

export interface RenderAppOptions {
  /** Forwarded to the file input's WASM bridge; injectable for testing. */
  bridgeOptions?: StageFolderInputOptions["bridgeOptions"];
  /** Forwarded to the `sff` WASM bridge (sprite reference validation); injectable for testing. */
  sffBridgeOptions?: SffWasmBridgeOptions;
}

/**
 * Keyboard shortcut wiring (backlog item 009) module-level state, mirroring
 * `lifebar-editor`'s own identical shape: `appShortcutManager` is a
 * long-lived singleton outliving any one `renderApp` call, so a repeated
 * call (a real reload never does this, but tests calling it many times
 * against the same jsdom `window` do) must tear down what a *previous* call
 * attached before attaching its own, the same "replace, not append"
 * contract `renderApp` already gives its own DOM content.
 */
let currentShortcutKeydownListener:
  | ((event: KeyboardEvent) => void)
  | undefined;
/** Undo/Redo's own label bindings -- stable for a whole `renderApp` call (their buttons are created once, not recreated per document load). */
let currentToolbarShortcutLabelUnbinds: Array<() => void> = [];
/** Save/Export's button is recreated on every `mountDocument` call (a new file loaded, or the wizard used again) -- rebound each time, unlike the toolbar bindings above. */
let unbindSaveExportLabel: (() => void) | undefined;
/** Add BG Element's button is recreated on every structural change to the elements editor (even more often than Save/Export's) -- rebound after every such rerender. */
let unbindAddElementLabel: (() => void) | undefined;
let currentShortcutsPanelElement: WuikShortcutsPanelElement | undefined;
/**
 * Save/Export's own internal locale-change subscription (backlog item 010)
 * -- unlike `unbindSaveExportLabel` above (a shortcut-hint binding this file
 * owns directly), this one lives inside `save-export.ts` itself and must be
 * stopped the same "replace, don't accumulate" way before every fresh
 * `renderSaveExport` call, or a repeated document load/reload keeps piling
 * up listeners pointed at detached DOM. See .vibe/decisions/008.
 */
let unsubscribeSaveExportLocale: (() => void) | undefined;
/** This whole render's own top-level locale-change subscription (backlog item 010), covering everything this file retranslates directly. */
let currentUnsubscribeLocaleChange: (() => void) | undefined;

/**
 * Builds the app's root frame — a `web-ui-kit` `<wuik-app-shell>` with the
 * app title (plus version) in the toolbar, the stage file input (backlog
 * item 002), the New Stage Wizard (backlog item 005) as an alternative
 * entry point, the characteristics + BG element editors (backlog item
 * 003), the 3D model And stage settings editor (backlog item 006), and the
 * Save/Export button (backlog item 004) as `<main>` content, appearing
 * automatically once a stage loads or is created. Mirrors
 * `stage-viewer-web`'s own scaffold adoption: no sidebar/tabs yet, default
 * light theme only.
 */
export function renderApp(
  root: HTMLElement,
  version: string,
  options: RenderAppOptions = {},
): void {
  root.replaceChildren();

  if (currentShortcutKeydownListener !== undefined) {
    window.removeEventListener("keydown", currentShortcutKeydownListener);
    currentShortcutKeydownListener = undefined;
  }
  for (const unbind of currentToolbarShortcutLabelUnbinds) {
    unbind();
  }
  currentToolbarShortcutLabelUnbinds = [];
  unbindSaveExportLabel?.();
  unbindSaveExportLabel = undefined;
  unsubscribeSaveExportLocale?.();
  unsubscribeSaveExportLocale = undefined;
  unbindAddElementLabel?.();
  unbindAddElementLabel = undefined;
  if (currentShortcutsPanelElement !== undefined) {
    currentShortcutsPanelElement.manager = undefined;
    currentShortcutsPanelElement = undefined;
  }
  currentUnsubscribeLocaleChange?.();
  currentUnsubscribeLocaleChange = undefined;

  const shell = document.createElement("wuik-app-shell");

  const toolbar = document.createElement("wuik-toolbar");
  toolbar.slot = "toolbar";
  toolbar.setAttribute("role", "banner");
  const title = document.createElement("span");
  title.className = "app-title";
  title.textContent = `${APP_TITLE} — v${version}`;
  toolbar.appendChild(title);

  // Undo/Redo (backlog item 008): the explicit toolbar-control reachability
  // path, plus (item 009) a rebindable keyboard shortcut via the shared
  // shortcut manager wired at the bottom of this function.
  const undoRedoSection = document.createElement("div");
  undoRedoSection.className = "app-undo-redo";
  const undoRedoControls = renderUndoRedoControls(undoRedoSection);
  currentToolbarShortcutLabelUnbinds.push(
    bindShortcutLabel(
      undoRedoControls.undoButton,
      appShortcutManager,
      "undo",
      t("actions.undo", "Undo"),
    ),
    bindShortcutLabel(
      undoRedoControls.redoButton,
      appShortcutManager,
      "redo",
      t("actions.redo", "Redo"),
    ),
  );
  toolbar.appendChild(undoRedoSection);

  // Language switcher (backlog item 010): last in the toolbar, mirroring
  // every sibling OpenKakutou app's own placement.
  const localeSwitcher = document.createElement(
    "wuik-locale-switcher",
  ) as unknown as WuikLocaleSwitcherElement;
  localeSwitcher.className = "locale-switcher";
  localeSwitcher.setAttribute("label", t("app.languageLabel", "Language"));
  localeSwitcher.i18n = getI18n();
  toolbar.appendChild(localeSwitcher);

  shell.appendChild(toolbar);

  const main = document.createElement("main");
  const newStageWizardContainer = document.createElement("div");
  const characteristicsContainer = document.createElement("div");
  const elementsContainer = document.createElement("div");
  const modelEditorContainer = document.createElement("div");
  const saveExportContainer = document.createElement("div");
  const shortcutsPanelSectionContainer = document.createElement("div");

  // Reassigned by `mountDocument`/`rerenderElements` below, and read by the
  // keydown dispatcher and the locale-change subscription at the bottom of
  // this function -- `undefined` until a document is actually
  // loaded/created, so either safely no-ops via optional chaining rather
  // than throwing.
  let saveExportHandle: SaveExportHandle | undefined;
  let elementsHandle: ElementsEditorHandle | undefined;
  /** Set by `mountDocument`, re-invoked by the locale-change subscription below -- the exact same full-list-rebuild path a sprite-sheet decode already triggers, so a language switch preserves the current selection/expansion the same way. */
  let rerenderElements: (() => void) | undefined;

  /** One committed field's undo/redo Command, pushed by the characteristics editor -- hoisted so both the initial mount and a locale-triggered re-render use the exact same callback. */
  function handleCharacteristicsChange(command: Command): void {
    commandStack.push(command);
    undoRedoControls.refresh();
  }

  /**
   * Wires a stage document (from a real file load, or freshly built by the
   * New Stage Wizard) into the document store and the editor screens.
   * `spriteSheetBytes: null` skips the `sff` decode entirely — the wizard
   * path has no real sprite sheet to decode, so every BG element reference
   * simply reads as unverifiable rather than the editor waiting on a
   * decode that will never resolve. `focusCharacteristics` moves focus into
   * the characteristics editor once mounted — the wizard commits
   * immediately with no second confirm screen, so this is the only
   * positive confirmation a keyboard/screen-reader user gets that creation
   * actually landed.
   */
  function mountDocument(
    doc: StageDocument,
    spriteSheetBytes: Uint8Array | null,
    focusCharacteristics: boolean,
  ): void {
    // Undo/redo only ever applies to the currently loaded document — an
    // undo step from a document that's about to be replaced would corrupt
    // the new one (see .vibe/decisions/006). Cleared before the swap so no
    // stale history survives it.
    commandStack.clear();
    undoRedoControls.refresh();

    setStageDocument(doc);
    renderCharacteristicsEditor(characteristicsContainer, doc.stage, {
      onChange: handleCharacteristicsChange,
    });
    renderModelEditor(modelEditorContainer, doc.stage);
    unbindSaveExportLabel?.();
    unsubscribeSaveExportLocale?.();
    saveExportHandle = renderSaveExport(saveExportContainer);
    unsubscribeSaveExportLocale = saveExportHandle.unsubscribeLocale;
    unbindSaveExportLabel = bindShortcutLabel(
      saveExportHandle.button,
      appShortcutManager,
      "save-export",
      t("actions.saveExport", "Save / Export"),
    );

    // Sprite reference validation needs the sheet's metadata, decoded via
    // a second, independent WASM module (see
    // .vibe/decisions/001-sff-wasm-bridged-directly-for-sprite-reference-validation.md).
    // Render once immediately (spriteGroups: null → every reference shows
    // as still loading), then again once decoded. A decode failure never
    // reaches the user as a crash — it's the same failure shape as an
    // absent sheet as far as this editor is concerned: no verifiable
    // sprite list, so every reference falls back to unverifiable/invalid
    // rather than the editor hanging on "loading" forever.
    const expandedRows = new Set<number>();
    // Persisted the same way as expandedRows above (backlog item 007): a
    // sprite sheet finishing decode re-renders this editor, and an
    // in-progress batch selection must survive that the same way an
    // expanded row does.
    const selectedElements = new Set<BGElement>();
    let spriteGroups: SpriteGroup[] | null =
      spriteSheetBytes === null ? [] : null;

    /**
     * Rebinds the shortcut-hint label onto whichever "Add element" button
     * currently exists in `elementsContainer`. Unlike Save/Export or
     * Undo/Redo, this button is recreated on every *structural* rerender
     * (add, remove, type switch, a batch apply/delete, or a locale change)
     * -- not just on a fresh document load -- and `elements-editor.ts`'s
     * own internal `rerender()` closure (which every one of those user
     * actions calls directly) bypasses `rerenderElements` below entirely.
     * So this must be called from two places: here, for the
     * document-load/sprite-sheet-decode/locale-change paths that do go
     * through `rerenderElements`, and again from `onChange` below, which
     * fires after *every* committed edit (structural or not) regardless of
     * which internal path rebuilt the DOM. A field-only edit doesn't
     * actually replace the button, so rebinding there is a harmless, cheap
     * no-op-ish repeat. Reads the translated label fresh every call, so a
     * locale change picks it up automatically the next time this runs.
     */
    function rebindAddElementLabel(): void {
      unbindAddElementLabel?.();
      const addElementButton = elementsContainer.querySelector<HTMLElement>(
        '[data-action="add-element"]',
      );
      if (addElementButton) {
        unbindAddElementLabel = bindShortcutLabel(
          addElementButton,
          appShortcutManager,
          "add-element",
          t("actions.addElement", "Add BG Element"),
        );
      }
    }

    rerenderElements = () => {
      elementsHandle = renderElementsEditor(
        elementsContainer,
        doc.stage,
        spriteGroups,
        {
          expandedRows,
          selectedElements,
          onChange: (command) => {
            commandStack.push(command);
            undoRedoControls.refresh();
            rebindAddElementLabel();
          },
        },
      );
      rebindAddElementLabel();
    };
    rerenderElements();

    if (spriteSheetBytes !== null) {
      loadSpriteSheet(spriteSheetBytes, options.sffBridgeOptions)
        .then((sheetResult) => {
          spriteGroups = sheetResult.ok ? sheetResult.spriteGroups : [];
        })
        .catch(() => {
          spriteGroups = [];
        })
        .finally(() => rerenderElements?.());
    }

    if (focusCharacteristics) {
      characteristicsContainer.querySelector<HTMLElement>("input")?.focus();
    }
  }

  renderStageFileInput(main, {
    onLoaded: (result) => mountDocument(result, result.sffBytes, false),
    bridgeOptions: options.bridgeOptions,
  });

  // No locale-sensitive state of its own -- re-invoked wholesale by the
  // locale-change subscription below, same as `rerenderElements` above.
  function refreshWizard(): void {
    renderNewStageWizard(newStageWizardContainer, {
      onCreated: (doc) => mountDocument(doc, null, true),
    });
  }
  refreshWizard();

  // Keyboard Shortcuts panel (backlog item 009): the only discovery path
  // for this brand-new capability, so it starts expanded and sits at the
  // bottom of the main content -- after Save/Export, not above it, so it
  // doesn't push more load-bearing content down the page on first paint.
  // See .vibe/decisions/007-remappable-shortcuts-actions-and-batch-delete-design.md.
  // Retranslates its own header label internally on a locale change (see
  // shortcuts-panel-section.ts) -- nothing for this file to wire up.
  currentShortcutsPanelElement = renderShortcutsPanelSection(
    shortcutsPanelSectionContainer,
    appShortcutManager,
  );

  main.append(
    newStageWizardContainer,
    characteristicsContainer,
    elementsContainer,
    modelEditorContainer,
    saveExportContainer,
    shortcutsPanelSectionContainer,
  );
  shell.appendChild(main);

  root.appendChild(shell);

  currentShortcutKeydownListener = (event: KeyboardEvent) => {
    handleAppShortcutKeydown(event, appShortcutManager, {
      onSaveExport: () => saveExportHandle?.triggerSaveExport(),
      onUndo: () => undoRedoControls.undo(),
      onRedo: () => undoRedoControls.redo(),
      onAddElement: () => elementsHandle?.triggerAddElement(),
      onDeleteSelection: () => elementsHandle?.triggerDeleteSelection(),
    });
  };
  window.addEventListener("keydown", currentShortcutKeydownListener);

  /**
   * Recomputes `element`'s shortcut-hint `title`/`aria-keyshortcuts` from
   * the manager's current live binding and a freshly translated base label
   * -- called directly here (backlog item 010) rather than by re-calling
   * `bindShortcutLabel`, which would attach a second, permanent `"change"`
   * listener onto the shared, long-lived `appShortcutManager` on every
   * language switch. See .vibe/decisions/008-i18n-integration-approach.md.
   */
  function applyShortcutHint(
    element: HTMLElement,
    actionId: string,
    key: string,
    defaultLabel: string,
  ): void {
    const binding = appShortcutManager.getBinding(actionId);
    element.title = formatShortcutTitle(t(key, defaultLabel), binding);
  }

  // Live locale switching (backlog item 010): re-translates every piece of
  // "chrome" this file owns directly -- the switcher's own label, the
  // Undo/Redo buttons' text and shortcut-hint title/aria-keyshortcuts, and
  // Save/Export's own shortcut-hint title (its visible text/status
  // retranslates itself, from its own internal subscription) -- and
  // re-invokes the characteristics/model/elements editors' and the
  // wizard's own existing render calls, which preserve every bit of
  // in-progress state each one already threads through (selection,
  // expansion, the model editor's live preview session). The stage file
  // input, the 3D live preview's own failure banner, and the Keyboard
  // Shortcuts panel each retranslate themselves internally. See
  // .vibe/decisions/008-i18n-integration-approach.md.
  currentUnsubscribeLocaleChange = onLocaleChange(() => {
    localeSwitcher.setAttribute("label", t("app.languageLabel", "Language"));
    undoRedoControls.undoButton.textContent = t("actions.undo", "Undo");
    undoRedoControls.redoButton.textContent = t("actions.redo", "Redo");
    applyShortcutHint(
      undoRedoControls.undoButton,
      "undo",
      "actions.undo",
      "Undo",
    );
    applyShortcutHint(
      undoRedoControls.redoButton,
      "redo",
      "actions.redo",
      "Redo",
    );
    if (saveExportHandle) {
      applyShortcutHint(
        saveExportHandle.button,
        "save-export",
        "actions.saveExport",
        "Save / Export",
      );
    }

    const loadedStage = getStageDocument()?.stage;
    if (loadedStage) {
      renderCharacteristicsEditor(characteristicsContainer, loadedStage, {
        onChange: handleCharacteristicsChange,
      });
      renderModelEditor(modelEditorContainer, loadedStage);
      rerenderElements?.();
    }
    refreshWizard();
  });
}

async function mount(): Promise<void> {
  await initAppI18n();
  const app = document.querySelector<HTMLDivElement>("#app");
  if (app) {
    renderApp(app, appVersion);
  }
}

if (document.readyState === "complete") {
  void mount();
} else {
  window.addEventListener("load", () => void mount(), { once: true });
}
