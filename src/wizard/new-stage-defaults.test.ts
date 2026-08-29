import { describe, expect, it } from "vitest";
import { STAGE_TEMPLATES, createBlankStage } from "./new-stage-defaults.ts";

describe("createBlankStage", () => {
  it("produces a valid coordinate space and no BG elements", () => {
    const stage = createBlankStage();

    expect(stage.bgDef.localCoordWidth).toBeGreaterThan(0);
    expect(stage.bgDef.localCoordHeight).toBeGreaterThan(0);
    expect(stage.elements).toEqual([]);
  });

  it("gives the stage a friendly default name rather than a blank one", () => {
    const stage = createBlankStage();

    expect(stage.name.length).toBeGreaterThan(0);
  });

  it("is a 2D stage (no 3D model file) with sensible, non-degenerate camera bounds and boundaries", () => {
    const stage = createBlankStage();

    expect(stage.bgDef.modelFile).toBe("");
    expect(stage.cameraBounds.left).toBeLessThan(stage.cameraBounds.right);
    expect(stage.stageBoundaries.left).toBeLessThan(
      stage.stageBoundaries.right,
    );
  });

  it("returns a fresh, independently-mutable object on every call", () => {
    const a = createBlankStage();
    const b = createBlankStage();
    a.name = "changed";
    a.cameraBounds.left = -999;

    expect(b.name).not.toBe("changed");
    expect(b.cameraBounds.left).not.toBe(-999);
  });
});

describe("STAGE_TEMPLATES", () => {
  it("offers at least one starter template", () => {
    expect(STAGE_TEMPLATES.length).toBeGreaterThanOrEqual(1);
  });

  it("each template has a unique id and a non-empty label", () => {
    const ids = STAGE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of STAGE_TEMPLATES) {
      expect(template.label.length).toBeGreaterThan(0);
    }
  });

  it("each template builds a stage pre-populated with at least one example BG element", () => {
    for (const template of STAGE_TEMPLATES) {
      const stage = template.build();
      expect(stage.elements?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("every template element's sprite reference is the unset sentinel, never a fabricated fake reference", () => {
    for (const template of STAGE_TEMPLATES) {
      const stage = template.build();
      for (const element of stage.elements ?? []) {
        if (element.type === "normal" || element.type === "parallax") {
          expect(element.sprite).toEqual({ group: -1, image: -1 });
        }
      }
    }
  });

  it("each template call returns a fresh, independently-mutable stage", () => {
    const template = STAGE_TEMPLATES[0];
    if (!template) throw new Error("expected at least one template");

    const a = template.build();
    const b = template.build();
    a.name = "changed";
    const firstElement = (a.elements ?? [])[0];
    if (!firstElement) throw new Error("expected at least one element");
    firstElement.name = "changed-element";

    expect(b.name).not.toBe("changed");
    expect((b.elements ?? [])[0]?.name).not.toBe("changed-element");
  });

  it("shares the same sensible base defaults (coordinate space, 2D, non-degenerate bounds) as the blank stage", () => {
    const blank = createBlankStage();
    for (const template of STAGE_TEMPLATES) {
      const stage = template.build();
      expect(stage.bgDef.localCoordWidth).toBe(blank.bgDef.localCoordWidth);
      expect(stage.bgDef.localCoordHeight).toBe(blank.bgDef.localCoordHeight);
      expect(stage.bgDef.modelFile).toBe("");
    }
  });
});
