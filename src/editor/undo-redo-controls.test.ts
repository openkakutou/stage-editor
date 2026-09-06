import { CommandStack } from "@openkakutou/web-ui-kit";
import { afterEach, describe, expect, it } from "vitest";
import { renderUndoRedoControls } from "./undo-redo-controls.ts";

function controls(root: HTMLElement) {
  return {
    undo: root.querySelector<HTMLElement>('[data-action="undo"]'),
    redo: root.querySelector<HTMLElement>('[data-action="redo"]'),
  };
}

describe("renderUndoRedoControls", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders Undo and Redo controls, both disabled when the stack has no history", () => {
    const stack = new CommandStack();
    const root = document.createElement("div");

    renderUndoRedoControls(root, { commandStack: stack });

    const { undo, redo } = controls(root);
    expect(undo).not.toBeNull();
    expect(redo).not.toBeNull();
    expect(undo?.hasAttribute("disabled")).toBe(true);
    expect(redo?.hasAttribute("disabled")).toBe(true);
  });

  it("reflects the stack's state once refreshed after an external push", () => {
    const stack = new CommandStack();
    const root = document.createElement("div");
    const handle = renderUndoRedoControls(root, { commandStack: stack });

    let value = 0;
    stack.push({
      do: () => {
        value = 1;
      },
      undo: () => {
        value = 0;
      },
    });
    handle.refresh();

    const { undo, redo } = controls(root);
    expect(value).toBe(1);
    expect(undo?.hasAttribute("disabled")).toBe(false);
    expect(redo?.hasAttribute("disabled")).toBe(true);
  });

  it("clicking Undo reverts the last pushed command and disables itself once history is empty", () => {
    const stack = new CommandStack();
    const root = document.createElement("div");
    const handle = renderUndoRedoControls(root, { commandStack: stack });

    let value = 0;
    stack.push({
      do: () => {
        value = 1;
      },
      undo: () => {
        value = 0;
      },
    });
    handle.refresh();

    controls(root).undo?.click();

    expect(value).toBe(0);
    const { undo, redo } = controls(root);
    expect(undo?.hasAttribute("disabled")).toBe(true);
    expect(redo?.hasAttribute("disabled")).toBe(false);
  });

  it("clicking Redo replays the most recently undone command", () => {
    const stack = new CommandStack();
    const root = document.createElement("div");
    const handle = renderUndoRedoControls(root, { commandStack: stack });

    let value = 0;
    stack.push({
      do: () => {
        value = 1;
      },
      undo: () => {
        value = 0;
      },
    });
    handle.refresh();
    controls(root).undo?.click();

    controls(root).redo?.click();

    expect(value).toBe(1);
    const { undo, redo } = controls(root);
    expect(undo?.hasAttribute("disabled")).toBe(false);
    expect(redo?.hasAttribute("disabled")).toBe(true);
  });

  it("clicking Undo with no history does nothing and stays disabled", () => {
    const stack = new CommandStack();
    const root = document.createElement("div");
    renderUndoRedoControls(root, { commandStack: stack });

    expect(() => controls(root).undo?.click()).not.toThrow();
    expect(controls(root).undo?.hasAttribute("disabled")).toBe(true);
  });

  it("replaces previous content instead of appending on repeated renders", () => {
    const stack = new CommandStack();
    const root = document.createElement("div");

    renderUndoRedoControls(root, { commandStack: stack });
    renderUndoRedoControls(root, { commandStack: stack });

    expect(root.querySelectorAll('[data-action="undo"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-action="redo"]')).toHaveLength(1);
  });

  it("the handle's undo()/redo() methods perform the same action as clicking, for a future keyboard-shortcut dispatcher (backlog item 009)", () => {
    const stack = new CommandStack();
    const root = document.createElement("div");
    const handle = renderUndoRedoControls(root, { commandStack: stack });

    let value = 0;
    stack.push({
      do: () => {
        value = 1;
      },
      undo: () => {
        value = 0;
      },
    });
    handle.refresh();

    handle.undo();
    expect(value).toBe(0);
    expect(controls(root).undo?.hasAttribute("disabled")).toBe(true);

    handle.redo();
    expect(value).toBe(1);
    expect(controls(root).redo?.hasAttribute("disabled")).toBe(true);
  });

  it("calling undo()/redo() with no history does nothing and stays disabled", () => {
    const stack = new CommandStack();
    const root = document.createElement("div");
    const handle = renderUndoRedoControls(root, { commandStack: stack });

    expect(() => handle.undo()).not.toThrow();
    expect(() => handle.redo()).not.toThrow();
    expect(controls(root).undo?.hasAttribute("disabled")).toBe(true);
    expect(controls(root).redo?.hasAttribute("disabled")).toBe(true);
  });

  it("exposes the rendered Undo/Redo buttons on the handle", () => {
    const stack = new CommandStack();
    const root = document.createElement("div");

    const handle = renderUndoRedoControls(root, { commandStack: stack });

    expect(handle.undoButton).toBe(root.querySelector('[data-action="undo"]'));
    expect(handle.redoButton).toBe(root.querySelector('[data-action="redo"]'));
  });
});
