import { ShortcutManager } from "@openkakutou/web-ui-kit";
import { describe, expect, it } from "vitest";
import { initAppI18n } from "../i18n/i18n.ts";
import { renderShortcutsPanelSection } from "./shortcuts-panel-section.ts";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
  };
}

function newManager(): ShortcutManager {
  const manager = new ShortcutManager({ storage: memoryStorage() });
  manager.register({
    id: "save-export",
    label: "Save / Export",
    defaultKey: "Ctrl+S",
  });
  return manager;
}

describe("renderShortcutsPanelSection", () => {
  it("mounts a <wuik-shortcuts-panel> fed the given manager", () => {
    const manager = newManager();
    const root = document.createElement("div");

    renderShortcutsPanelSection(root, manager);

    const panelEl = root.querySelector("wuik-shortcuts-panel");
    expect(panelEl).not.toBeNull();
    // biome-ignore lint/suspicious/noExplicitAny: reading a custom element's own JS property, not part of any typed DOM interface.
    expect((panelEl as any).manager).toBe(manager);
  });

  it("starts expanded by default, so the feature is discoverable without an extra click (backlog item 009)", () => {
    const manager = newManager();
    const root = document.createElement("div");

    renderShortcutsPanelSection(root, manager);

    const body = root.querySelector<HTMLElement>(
      ".shortcuts-panel-section__body",
    );
    const toggle = root.querySelector<HTMLElement>(
      ".shortcuts-panel-section__toggle",
    );
    expect(body?.hidden).toBe(false);
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  });

  it("can start collapsed when explicitly requested", () => {
    const manager = newManager();
    const root = document.createElement("div");

    renderShortcutsPanelSection(root, manager, { expanded: false });

    const body = root.querySelector<HTMLElement>(
      ".shortcuts-panel-section__body",
    );
    expect(body?.hidden).toBe(true);
  });

  it("toggling the header collapses and then re-expands the body, flipping aria-expanded", () => {
    const manager = newManager();
    const root = document.createElement("div");
    renderShortcutsPanelSection(root, manager);

    const toggle = root.querySelector<HTMLElement>(
      ".shortcuts-panel-section__toggle",
    );
    const body = root.querySelector<HTMLElement>(
      ".shortcuts-panel-section__body",
    );

    toggle?.click();
    expect(body?.hidden).toBe(true);
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");

    toggle?.click();
    expect(body?.hidden).toBe(false);
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  });

  it("replaces previous content instead of appending on repeated renders", () => {
    const manager = newManager();
    const root = document.createElement("div");

    renderShortcutsPanelSection(root, manager);
    renderShortcutsPanelSection(root, manager);

    expect(root.querySelectorAll("wuik-shortcuts-panel")).toHaveLength(1);
  });

  it("returns the mounted <wuik-shortcuts-panel> element itself, for a caller that must unbind it before discarding it", () => {
    const manager = newManager();
    const root = document.createElement("div");

    const panelEl = renderShortcutsPanelSection(root, manager);

    expect(panelEl).toBe(root.querySelector("wuik-shortcuts-panel"));
    // biome-ignore lint/suspicious/noExplicitAny: reading a custom element's own JS property, not part of any typed DOM interface.
    expect((panelEl as any).manager).toBe(manager);
  });

  it("retranslates the header label in place on a locale change, without collapsing the body (backlog item 010)", async () => {
    const manager = newManager();
    const root = document.createElement("div");
    const i18n = await initAppI18n();

    renderShortcutsPanelSection(root, manager);
    const toggle = root.querySelector<HTMLElement>(
      ".shortcuts-panel-section__toggle",
    );
    const body = root.querySelector<HTMLElement>(
      ".shortcuts-panel-section__body",
    );
    toggle?.click(); // collapse it, to prove the locale change doesn't reset this
    expect(body?.hidden).toBe(true);

    await i18n.changeLanguage("fr");

    expect(toggle?.textContent).toBe("Raccourcis clavier");
    expect(body?.hidden).toBe(true);

    await i18n.changeLanguage("en");
  });
});
