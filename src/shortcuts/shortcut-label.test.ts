import { ShortcutManager } from "@openkakutou/web-ui-kit";
import { describe, expect, it } from "vitest";
import { bindShortcutLabel, formatShortcutTitle } from "./shortcut-label.ts";

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

describe("formatShortcutTitle", () => {
  it("appends the key in parentheses when one is given", () => {
    expect(formatShortcutTitle("Save / Export", "Ctrl+S")).toBe(
      "Save / Export (Ctrl+S)",
    );
  });

  it("falls back to the plain label when there is no binding", () => {
    expect(formatShortcutTitle("Save / Export", undefined)).toBe(
      "Save / Export",
    );
  });
});

describe("bindShortcutLabel", () => {
  it("sets the element's title and aria-keyshortcuts to the action's current binding", () => {
    const manager = newManager();
    const button = document.createElement("button");

    bindShortcutLabel(button, manager, "save-export", "Save / Export");

    expect(button.title).toBe("Save / Export (Ctrl+S)");
    expect(button.getAttribute("aria-keyshortcuts")).toBe("Ctrl+S");
  });

  it("updates the label live when the action is rebound", () => {
    const manager = newManager();
    const button = document.createElement("button");
    bindShortcutLabel(button, manager, "save-export", "Save / Export");

    manager.rebind("save-export", "Ctrl+E");

    expect(button.title).toBe("Save / Export (Ctrl+E)");
    expect(button.getAttribute("aria-keyshortcuts")).toBe("Ctrl+E");
  });

  it("ignores a rebind of a different action", () => {
    const manager = newManager();
    manager.register({ id: "undo", label: "Undo", defaultKey: "Ctrl+Z" });
    const button = document.createElement("button");
    bindShortcutLabel(button, manager, "save-export", "Save / Export");

    manager.rebind("undo", "Ctrl+U");

    expect(button.title).toBe("Save / Export (Ctrl+S)");
  });

  it("falls back to the plain label for an action id the manager has never registered", () => {
    const manager = newManager();
    const button = document.createElement("button");

    bindShortcutLabel(button, manager, "does-not-exist", "Mystery Action");

    expect(button.title).toBe("Mystery Action");
    expect(button.hasAttribute("aria-keyshortcuts")).toBe(false);
  });

  it("stops updating the label once the returned unsubscribe function is called", () => {
    const manager = newManager();
    const button = document.createElement("button");
    const unbind = bindShortcutLabel(
      button,
      manager,
      "save-export",
      "Save / Export",
    );

    unbind();
    manager.rebind("save-export", "Ctrl+E");

    expect(button.title).toBe("Save / Export (Ctrl+S)");
  });
});
