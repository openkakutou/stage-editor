import "@openkakutou/web-ui-kit/tokens.css";
import "@openkakutou/web-ui-kit";
import "./style.css";
import { setStageDocument } from "./document/stage-document-store.ts";
import { renderStageFileInput } from "./input/stage-file-input-view.ts";
import type { StageFolderInputOptions } from "./input/stage-file-input.ts";
import { appVersion } from "./version.ts";

const APP_TITLE = "Stage Editor";

export interface RenderAppOptions {
  /** Forwarded to the file input's WASM bridge; injectable for testing. */
  bridgeOptions?: StageFolderInputOptions["bridgeOptions"];
}

/**
 * Builds the app's root frame — a `web-ui-kit` `<wuik-app-shell>` with the
 * app title (plus version) in the toolbar and the stage file input
 * (backlog item 002) as `<main>` content. A successful load is stored in
 * `stage-document-store.ts`, ready for item 003's editing screens — no
 * "ready to edit" affordance is shown here, since none of that exists yet.
 * Mirrors `stage-viewer-web`'s own scaffold adoption: no sidebar/tabs yet,
 * default light theme only. No save/dirty-state affordance either — no
 * editing capability exists yet, so a disabled save button or "unsaved
 * changes" indicator here would be a permanently non-functional control,
 * not a useful signal; deferred until real editing UI (items 003+)
 * actually needs it.
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
  renderStageFileInput(main, {
    onLoaded: (result) => {
      // Always a full replace, no confirmation: nothing is editable yet
      // in this item, so there is no unsaved state a new load could lose.
      setStageDocument(result);
    },
    bridgeOptions: options.bridgeOptions,
  });
  shell.appendChild(main);

  root.appendChild(shell);
}

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  renderApp(app, appVersion);
}
