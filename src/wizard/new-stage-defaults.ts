// Pure data builders for the New Stage Wizard (backlog item 005) — no DOM,
// no WASM, no document-store dependency, so every default/template is
// independently unit-testable. See
// .vibe/decisions/003-new-stage-defaults-and-unsaved-changes-guard.md for
// the reasoning behind the specific default values and the "unset sprite
// reference" choice for template elements.
import type { BGElement, StageData } from "../wasm/types.ts";

/** Standard MUGEN/Ikemen GO local coordinate space (width × height), used by the large majority of real stages. */
const LOCAL_COORD_WIDTH = 320;
const LOCAL_COORD_HEIGHT = 240;

function baseStage(name: string): StageData {
  return {
    name,
    author: "",
    bgDef: {
      spriteFile: "",
      localCoordWidth: LOCAL_COORD_WIDTH,
      localCoordHeight: LOCAL_COORD_HEIGHT,
      // Ground level at the bottom of the local coordinate space — the
      // common convention for a stage with no special vertical offset.
      zOffset: LOCAL_COORD_HEIGHT,
      // 1 on both ends: no camera zoom range configured yet, rather than an
      // arbitrary in/out pair that would imply an intentional zoom effect.
      zoomOut: 1,
      zoomIn: 1,
      modelFile: "",
      near: 0,
      far: 0,
      fov: 0,
      yShift: 0,
    },
    elements: [],
    // A generous, symmetric default range — wide enough that a first-time
    // user placing elements/characters won't immediately hit the edge,
    // narrow enough to still be a meaningful clamp rather than "no bounds
    // at all". Mirrors the range real-world stage fixtures commonly use
    // for stageBoundaries (see stage-viewer-web's own test corpus).
    cameraBounds: { left: -160, right: 160, high: -100, low: 0 },
    stageBoundaries: { left: -1000, right: 1000, topBound: 0, bottomBound: 0 },
    model: {
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      scaleX: 0,
      scaleY: 0,
      scaleZ: 0,
      environment: "",
      environmentIntensity: 0,
    },
    scaling: {
      depthToScreen: 0,
      topZ: 0,
      bottomZ: 0,
      topScale: 0,
      bottomScale: 0,
    },
    playerStartZ: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, p8: 0 },
  };
}

/**
 * A brand-new stage from scratch: a minimal valid `BGdef` plus sensible
 * default camera bounds and boundaries, and zero BG elements — the user
 * adds their own from the BG element editor.
 */
export function createBlankStage(): StageData {
  return baseStage("New Stage");
}

function unassignedElement(overrides: Partial<BGElement>): BGElement {
  return {
    name: "",
    type: "normal",
    // The established "not yet assigned" sentinel (see
    // elements-editor.ts's own `resolveSpriteRefStatus`) — never a
    // fabricated reference like {0, 0}, which would incorrectly render as
    // an "invalid reference" error the moment the editor shows it, since a
    // from-scratch stage has no real sprite sheet attached yet.
    sprite: { group: -1, image: -1 },
    actionNumber: 0,
    layerNo: 0,
    startX: 0,
    startY: 0,
    deltaX: 1,
    deltaY: 1,
    tileX: 0,
    tileY: 0,
    tileSpacingX: 0,
    tileSpacingY: 0,
    ...overrides,
  };
}

export interface StageTemplate {
  id: string;
  label: string;
  /** Builds a fresh, independently-mutable stage every call. */
  build: () => StageData;
}

export const STAGE_TEMPLATES: readonly StageTemplate[] = [
  {
    id: "simple-room",
    label: "Simple Room",
    build: () => {
      const stage = baseStage("Simple Room");
      stage.elements = [
        unassignedElement({
          name: "background",
          type: "normal",
          layerNo: 0,
          startX: 0,
          startY: 0,
        }),
        unassignedElement({
          name: "foreground",
          type: "parallax",
          layerNo: 1,
          startX: 0,
          startY: 0,
          deltaX: 1.2,
          deltaY: 1,
        }),
      ];
      return stage;
    },
  },
];
