import "@openkakutou/web-ui-kit/tokens.css";
import "@openkakutou/web-ui-kit";
import "./style.css";
import { appVersion } from "./version.ts";

const APP_TITLE = "Stage Editor";

/**
 * Builds the app's root frame — a `web-ui-kit` `<wuik-app-shell>` with the
 * app title (plus version) in the toolbar and an empty `<main>` content
 * region, ready for the stage file input (backlog item 002) and the
 * editing screens that follow it. Mirrors `stage-viewer-web`'s own
 * scaffold adoption: no sidebar/tabs yet, default light theme only. No
 * save/dirty-state affordance either — no editing capability exists yet,
 * so a disabled save button or "unsaved changes" indicator here would be
 * a permanently non-functional control, not a useful signal; deferred
 * until real editing UI (items 002+) actually needs it.
 */
export function renderApp(root: HTMLElement, version: string): void {
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
  shell.appendChild(main);

  root.appendChild(shell);
}

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  renderApp(app, appVersion);
}
