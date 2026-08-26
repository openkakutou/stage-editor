import "@openkakutou/web-ui-kit/tokens.css";
import "@openkakutou/web-ui-kit";
import "./style.css";
import { setStageDocument } from "./document/stage-document-store.ts";
import { renderCharacteristicsEditor } from "./editor/characteristics-editor.ts";
import { renderElementsEditor } from "./editor/elements-editor.ts";
import { renderStageFileInput } from "./input/stage-file-input-view.ts";
import type { StageFolderInputOptions } from "./input/stage-file-input.ts";
import { appVersion } from "./version.ts";
import type { SffWasmBridgeOptions } from "./wasm/sff-bridge.ts";
import { loadSpriteSheet } from "./wasm/sff-bridge.ts";
import type { SpriteGroup } from "./wasm/sff-types.ts";

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
 * item 002), and the characteristics + BG element editors (backlog item
 * 003) as `<main>` content, appearing automatically once a stage loads.
 * Mirrors `stage-viewer-web`'s own scaffold adoption: no sidebar/tabs yet,
 * default light theme only. No save/dirty-state affordance yet — save is a
 * separate, not-yet-built item.
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
  const characteristicsContainer = document.createElement("div");
  const elementsContainer = document.createElement("div");

  renderStageFileInput(main, {
    onLoaded: (result) => {
      setStageDocument(result);
      renderCharacteristicsEditor(characteristicsContainer, result.stage);

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
      let spriteGroups: SpriteGroup[] | null = null;
      const rerenderElements = () => {
        renderElementsEditor(elementsContainer, result.stage, spriteGroups, {
          expandedRows,
        });
      };
      rerenderElements();

      loadSpriteSheet(result.sffBytes, options.sffBridgeOptions)
        .then((sheetResult) => {
          spriteGroups = sheetResult.ok ? sheetResult.spriteGroups : [];
        })
        .catch(() => {
          spriteGroups = [];
        })
        .finally(rerenderElements);
    },
    bridgeOptions: options.bridgeOptions,
  });
  main.append(characteristicsContainer, elementsContainer);
  shell.appendChild(main);

  root.appendChild(shell);
}

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  renderApp(app, appVersion);
}
