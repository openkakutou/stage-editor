import { beforeEach, describe, expect, it } from "vitest";
import {
  appShortcutManager,
  createAppShortcutManager,
} from "./app-shortcut-manager.ts";

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

describe("createAppShortcutManager", () => {
  it("registers this app's five actions with their default bindings", () => {
    const manager = createAppShortcutManager(memoryStorage());

    expect(manager.list().map((b) => ({ id: b.id, key: b.key }))).toEqual([
      { id: "save-export", key: "Ctrl+S" },
      { id: "undo", key: "Ctrl+Z" },
      { id: "redo", key: "Ctrl+Y" },
      { id: "add-element", key: "Ctrl+Shift+A" },
      { id: "delete-selection", key: "Delete" },
    ]);
  });

  it("persists a rebind through the given storage so a second manager over the same storage picks it up", () => {
    const storage = memoryStorage();
    const first = createAppShortcutManager(storage);
    first.rebind("save-export", "Ctrl+E");

    const second = createAppShortcutManager(storage);

    expect(second.getBinding("save-export")).toBe("Ctrl+E");
  });

  it("keeps each manager's overrides independent when given separate storage instances", () => {
    const first = createAppShortcutManager(memoryStorage());
    first.rebind("undo", "Ctrl+U");

    const second = createAppShortcutManager(memoryStorage());

    expect(second.getBinding("undo")).toBe("Ctrl+Z");
  });

  it("still registers actions when no storage is given (falls back to the real localStorage)", () => {
    expect(() => createAppShortcutManager()).not.toThrow();
    expect(createAppShortcutManager().list()).toHaveLength(5);
  });
});

describe("appShortcutManager", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it("is a ready-to-use singleton with this app's actions already registered", () => {
    expect(appShortcutManager.list().map((b) => b.id)).toEqual([
      "save-export",
      "undo",
      "redo",
      "add-element",
      "delete-selection",
    ]);
  });
});
