import { describe, expect, it } from "vitest";
import { fieldCommand } from "./field-command.ts";

describe("fieldCommand", () => {
  it("do() applies the new value and undo() restores the old one", () => {
    let current = "old";
    const command = fieldCommand({
      oldValue: "old",
      newValue: "new",
      apply: (value) => {
        current = value;
      },
    });

    command.do();
    expect(current).toBe("new");

    command.undo();
    expect(current).toBe("old");
  });

  it("redo (a second do() call) re-applies the new value, not the old one", () => {
    let current = 1;
    const command = fieldCommand({
      oldValue: 1,
      newValue: 2,
      apply: (value) => {
        current = value;
      },
    });

    command.do();
    command.undo();
    command.do();

    expect(current).toBe(2);
  });

  it("carries the given coalesceKey through unchanged", () => {
    const command = fieldCommand({
      oldValue: 0,
      newValue: 1,
      apply: () => {},
      coalesceKey: "some.field",
    });

    expect(command.coalesceKey).toBe("some.field");
  });

  it("omits coalesceKey when none is given, so the entry never coalesces", () => {
    const command = fieldCommand({
      oldValue: 0,
      newValue: 1,
      apply: () => {},
    });

    expect(command.coalesceKey).toBeUndefined();
  });
});
