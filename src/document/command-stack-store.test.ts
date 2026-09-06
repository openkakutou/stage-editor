import { beforeEach, describe, expect, it } from "vitest";
import {
  commandStack,
  resetCommandStackForTests,
} from "./command-stack-store.ts";

describe("commandStack", () => {
  beforeEach(() => {
    resetCommandStackForTests();
  });

  it("is a shared instance every caller reads the same undo/redo state from", () => {
    let value = 0;
    commandStack.push({
      do: () => {
        value = 1;
      },
      undo: () => {
        value = 0;
      },
    });

    expect(value).toBe(1);
    expect(commandStack.canUndo).toBe(true);
    expect(commandStack.canRedo).toBe(false);
  });

  it("replays undo/redo across multiple pushes in the correct order", () => {
    const log: string[] = [];
    commandStack.push({
      do: () => log.push("do-a"),
      undo: () => log.push("undo-a"),
    });
    commandStack.push({
      do: () => log.push("do-b"),
      undo: () => log.push("undo-b"),
    });

    commandStack.undo();
    commandStack.undo();

    expect(log).toEqual(["do-a", "do-b", "undo-b", "undo-a"]);
  });

  it("resetCommandStackForTests empties both the undo and redo history", () => {
    commandStack.push({ do: () => {}, undo: () => {} });
    commandStack.undo();
    expect(commandStack.canRedo).toBe(true);

    resetCommandStackForTests();

    expect(commandStack.canUndo).toBe(false);
    expect(commandStack.canRedo).toBe(false);
  });
});
