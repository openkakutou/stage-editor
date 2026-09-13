import { describe, expect, it } from "vitest";
import type { BGdef, Model } from "../wasm/types.ts";
import { resolveCameraParams, resolveModelTransform } from "./model-camera.ts";

function bgDef(overrides: Partial<BGdef> = {}): BGdef {
  return {
    spriteFile: "",
    localCoordWidth: 320,
    localCoordHeight: 240,
    zOffset: 0,
    zoomOut: 1,
    zoomIn: 1,
    modelFile: "mystage.glb",
    near: 0,
    far: 0,
    fov: 0,
    yShift: 0,
    ...overrides,
  };
}

describe("resolveCameraParams", () => {
  it("uses the stage's own declared fov/near/far when all are positive and far > near", () => {
    expect(resolveCameraParams(bgDef({ fov: 60, near: 2, far: 5000 }))).toEqual(
      {
        fov: 60,
        near: 2,
        far: 5000,
      },
    );
  });

  it("falls back to a default fov when the stage declares 0 (a 2D-only stage's [Camera])", () => {
    const result = resolveCameraParams(bgDef({ fov: 0, near: 2, far: 5000 }));
    expect(result.fov).toBe(45);
  });

  it("falls back to a default fov when the stage declares a negative value", () => {
    const result = resolveCameraParams(bgDef({ fov: -10, near: 2, far: 5000 }));
    expect(result.fov).toBe(45);
  });

  it("falls back to a default near plane when the stage declares 0", () => {
    const result = resolveCameraParams(bgDef({ fov: 60, near: 0, far: 5000 }));
    expect(result.near).toBe(0.1);
  });

  it("falls back to a default far plane when it isn't greater than the resolved near plane", () => {
    const result = resolveCameraParams(bgDef({ fov: 60, near: 100, far: 50 }));
    expect(result.far).toBe(10000);
  });

  it("falls back to a default far plane when it exactly equals the resolved near plane", () => {
    const result = resolveCameraParams(bgDef({ fov: 60, near: 100, far: 100 }));
    expect(result.far).toBe(10000);
  });

  it("compares far against the *resolved* near (post-fallback), not the stage's raw declared near", () => {
    // near falls back to the default 0.1; far=1 is still > 0.1, so far
    // should be kept as declared, not silently defaulted too.
    const result = resolveCameraParams(bgDef({ fov: 60, near: 0, far: 1 }));
    expect(result.near).toBe(0.1);
    expect(result.far).toBe(1);
  });
});

function model(overrides: Partial<Model> = {}): Model {
  return {
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    environment: "",
    environmentIntensity: 1,
    ...overrides,
  };
}

describe("resolveModelTransform", () => {
  it("maps offsetX/Y/Z to a position tuple in that exact order", () => {
    const result = resolveModelTransform(
      model({ offsetX: 1, offsetY: 2, offsetZ: 3 }),
    );
    expect(result.position).toEqual([1, 2, 3]);
  });

  it("maps scaleX/Y/Z to a scale tuple in that exact order", () => {
    const result = resolveModelTransform(
      model({ scaleX: 2, scaleY: 3, scaleZ: 4 }),
    );
    expect(result.scale).toEqual([2, 3, 4]);
  });

  it("does not swap axes between position and scale", () => {
    const result = resolveModelTransform(model({ offsetX: 7, scaleX: 9 }));
    expect(result.position[0]).toBe(7);
    expect(result.scale[0]).toBe(9);
  });

  it("falls back to a default scale of 1 on every axis when a freshly-assigned model has never had its scale configured (a blank stage's [Model] declares 0)", () => {
    // A collapsed 0×0×0 scale renders as a literally invisible model — the
    // exact same "section never configured" zero-value landmine
    // `resolveCameraParams` already guards for fov/near/far, applied here to
    // the one degenerate case `stage-viewer-web`'s original, read-only
    // `resolveModelTransform` never had to handle: an editor can preview a
    // model against a truly blank, freshly-created stage.
    const result = resolveModelTransform(
      model({ scaleX: 0, scaleY: 0, scaleZ: 0 }),
    );
    expect(result.scale).toEqual([1, 1, 1]);
  });

  it("falls back to a default scale of 1 on a per-axis basis for a negative value", () => {
    const result = resolveModelTransform(
      model({ scaleX: -2, scaleY: 3, scaleZ: 4 }),
    );
    expect(result.scale).toEqual([1, 3, 4]);
  });

  it("keeps the stage's own declared scale unchanged when every axis is already positive", () => {
    const result = resolveModelTransform(
      model({ scaleX: 0.0141, scaleY: 0.0141, scaleZ: 0.0141 }),
    );
    expect(result.scale).toEqual([0.0141, 0.0141, 0.0141]);
  });
});
