import "@openkakutou/web-ui-kit/tokens.css";
import "@openkakutou/web-ui-kit";
import "./style.css";
import type { StageDocument } from "./document/stage-document-store.ts";
import { setStageDocument } from "./document/stage-document-store.ts";
import { renderCharacteristicsEditor } from "./editor/characteristics-editor.ts";
import { renderElementsEditor } from "./editor/elements-editor.ts";
import { renderSaveExport } from "./editor/save-export.ts";
import { renderStageFileInput } from "./input/stage-file-input-view.ts";
import type { StageFolderInputOptions } from "./input/stage-file-input.ts";
import { appVersion } from "./version.ts";
import type { SffWasmBridgeOptions } from "./wasm/sff-bridge.ts";
import { loadSpriteSheet } from "./wasm/sff-bridge.ts";
import type { SpriteGroup } from "./wasm/sff-types.ts";
import { renderNewStageWizard } from "./wizard/new-stage-wizard.ts";

const APP_TITLE = "Stage Editor";

export interface RenderAppOptions {
  /** Forwarded to the file input's WASM bridge; injectable for testing. */
  bridgeOptions?: StageFolderInputOptions["bridgeOptions"];
  /** Forwarded to the `sff` WASM bridge (sprite reference validation); injectable for testing. */
  sffBridgeOptions?: SffWasmBridgeOptions;
}

/**
 * Builds the app's root frame — a `web-ui-kit` `<wuik-app-shell>` with the
 * app title (plus version) in the toolbar, the stage file input (backlog
 * item 002), the New Stage Wizard (backlog item 005) as an alternative
 * entry point, the characteristics + BG element editors (backlog item
 * 003), and the Save/Export button (backlog item 004) as `<main>` content,
 * appearing automatically once a stage loads or is created. Mirrors
 * `stage-viewer-web`'s own scaffold adoption: no sidebar/tabs yet, default
 * light theme only.
 */
export function renderApp(
  root: HTMLElement,
  version: string,
  options: RenderAppOptions = {},
): void {
  root.replaceChildren();

  const shell = document.createElement("wuik-app-shell");

  const toolbar = document.createElement("wuik-toolbar");
  toolbar.slot = "toolbar";
  toolbar.setAttribute("role", "banner");
  const title = document.createElement("span");
  title.className = "app-title";
  title.textContent = `${APP_TITLE} — v${version}`;
  toolbar.appendChild(title);
  shell.appendChild(toolbar);

  const main = document.createElement("main");
  const newStageWizardContainer = document.createElement("div");
  const characteristicsContainer = document.createElement("div");
  const elementsContainer = document.createElement("div");
  const saveExportContainer = document.createElement("div");

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
    setStageDocument(doc);
    renderCharacteristicsEditor(characteristicsContainer, doc.stage);
    renderSaveExport(saveExportContainer);

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
    let spriteGroups: SpriteGroup[] | null =
      spriteSheetBytes === null ? [] : null;
    const rerenderElements = () => {
      renderElementsEditor(elementsContainer, doc.stage, spriteGroups, {
        expandedRows,
      });
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
        .finally(rerenderElements);
    }

    if (focusCharacteristics) {
      characteristicsContainer.querySelector<HTMLElement>("input")?.focus();
    }
  }

  renderStageFileInput(main, {
    onLoaded: (result) => mountDocument(result, result.sffBytes, false),
    bridgeOptions: options.bridgeOptions,
  });
  renderNewStageWizard(newStageWizardContainer, {
    onCreated: (doc) => mountDocument(doc, null, true),
  });
  main.append(
    newStageWizardContainer,
    characteristicsContainer,
    elementsContainer,
    saveExportContainer,
  );
  shell.appendChild(main);

  root.appendChild(shell);
}

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  renderApp(app, appVersion);
}
