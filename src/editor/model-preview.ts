// Backlog item 006: renders an Ikemen GO 3D model-based stage's glTF model,
// lit by its `.hdr` environment (image-based lighting), inside `web-ui-kit`'s
// `<wuik-viewport-3d>` orbit/pan/zoom camera control. That control owns only
// camera *math* (see its own repo's .vibe/decisions/010) — every actual
// three.js scene/renderer/loader concern below is this module's own job.
// Ported and adapted from `stage-viewer-web`'s own `src/viewer/model-preview.ts`
// (read-only): the mount/asset-load/render-on-demand shape is unchanged, but
// this module additionally returns an update handle so the editor's own
// field commits can mutate the already-loaded scene in place instead of
// reloading the renderer/glTF/HDR on every edit — see .vibe/decisions/004.
//
// `three` and its loaders are only ever dynamically imported from inside
// this file's default option functions, and those are only ever called once
// a model is actually assigned — a 2D-only stage (the common case) never
// pays the cost of downloading or evaluating this module's heaviest
// dependency at all.
import type * as THREE from "three";
import type { CameraParams, ModelTransform } from "./model-camera.ts";

/** The minimal shape this module needs from a loaded glTF result — deliberately
 * never reads `animations`: no skeletal/armature animation is ever played,
 * matching Ikemen GO's own current limitation (see the backlog item's own
 * acceptance criteria). Kept narrower than three.js's own `GLTF` type, which
 * also carries cameras/userData/etc. this module never touches. */
export interface LoadedModel {
  readonly scene: THREE.Object3D;
}

/** The camera snapshot shape `<wuik-viewport-3d>` exposes via `getCamera()`
 * and its `wuik-viewport3d-change` event — duck-typed locally since only the
 * component's class, not this data shape, is part of `web-ui-kit`'s public
 * export surface (see that repo's `src/canvas3d/index.ts`). */
export interface CameraSnapshotLike {
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly target: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}

/** The bytes needed to mount a 3D preview — `null` (not this type at all) means no model is currently assigned. */
export interface ModelPreviewInput {
  readonly modelBytes: Uint8Array;
  readonly environmentBytes: Uint8Array | null;
}

/**
 * Returned by `renderModelPreview` so a caller can push a later field commit
 * into the already-mounted scene without tearing anything down — see
 * .vibe/decisions/004, point 1. Both methods are safe no-ops before the
 * model has finished loading (nothing to mutate yet) and after the preview
 * has been torn down (a later `renderModelPreview(root, null, ...)` call, or
 * a fresh asset swap on the same root superseding this handle).
 */
export interface ModelPreviewHandle {
  /** Mutates the already-loaded model's position/scale and requests a re-render. */
  updateTransform(transform: ModelTransform): void;
  /** Mutates the already-created camera's near/far/fov and requests a re-render. */
  updateCamera(cameraParams: CameraParams): void;
}

const NOOP_HANDLE: ModelPreviewHandle = {
  updateTransform: () => {},
  updateCamera: () => {},
};

export interface ModelPreviewOptions {
  /** Constructs the WebGL renderer for `canvas`, or `null` if none could be created (no WebGL support, driver blocklist, etc). Defaults to a real `THREE.WebGLRenderer`; injectable for testing. */
  createRenderer?: (
    canvas: HTMLCanvasElement,
  ) => THREE.WebGLRenderer | null | Promise<THREE.WebGLRenderer | null>;
  /** Parses the referenced glTF model bytes. Defaults to the real `GLTFLoader`; injectable for testing. */
  loadGLTF?: (bytes: Uint8Array) => Promise<LoadedModel>;
  /** Parses the referenced `.hdr` bytes into an environment (IBL) texture, or `null` if it couldn't be built. Defaults to the real `HDRLoader` + `PMREMGenerator`; injectable for testing. */
  loadEnvironment?: (
    renderer: THREE.WebGLRenderer,
    bytes: Uint8Array,
  ) => THREE.Texture | null | Promise<THREE.Texture | null>;
  /** Schedules the next coalesced render. Defaults to the real global; injectable for deterministic testing. */
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  /** Cancels a scheduled render. Defaults to the real global; injectable for deterministic testing. */
  cancelAnimationFrame?: (handle: number) => void;
  /** Constructs the `ResizeObserver` watching the viewport's host size. Defaults to the real global (skipped entirely if unavailable); injectable for testing. */
  ResizeObserverCtor?: typeof ResizeObserver;
}

/** Copies `bytes` into a fresh, non-shared `ArrayBuffer` slice for a loader's `.parse()` call. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

async function defaultCreateRenderer(
  canvas: HTMLCanvasElement,
): Promise<THREE.WebGLRenderer | null> {
  try {
    const THREE_ = await import("three");
    return new THREE_.WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
}

async function defaultLoadGLTF(bytes: Uint8Array): Promise<LoadedModel> {
  const { GLTFLoader } = await import(
    "three/examples/jsm/loaders/GLTFLoader.js"
  );
  const loader = new GLTFLoader();
  const buffer = toArrayBuffer(bytes);
  return new Promise((resolve, reject) => {
    loader.parse(
      buffer,
      "",
      (gltf) => resolve({ scene: gltf.scene }),
      (err) => reject(err instanceof Error ? err : new Error(String(err))),
    );
  });
}

async function defaultLoadEnvironment(
  renderer: THREE.WebGLRenderer,
  bytes: Uint8Array,
): Promise<THREE.Texture | null> {
  try {
    const THREE_ = await import("three");
    const { HDRLoader } = await import(
      "three/examples/jsm/loaders/HDRLoader.js"
    );
    const buffer = toArrayBuffer(bytes);
    const loader = new HDRLoader();
    const parsed = loader.parse(buffer);
    if (!parsed) return null;

    const dataTexture = new THREE_.DataTexture(
      parsed.data,
      parsed.width,
      parsed.height,
      parsed.format,
      parsed.type,
    );
    dataTexture.mapping = THREE_.EquirectangularReflectionMapping;
    dataTexture.needsUpdate = true;

    const pmrem = new THREE_.PMREMGenerator(renderer);
    const envMap = pmrem.fromEquirectangular(dataTexture).texture;
    dataTexture.dispose();
    pmrem.dispose();
    return envMap;
  } catch {
    return null;
  }
}

/** Reads `<wuik-viewport-3d>`'s current camera via its real `getCamera()` method
 * if the real, registered custom element is present — a plain `HTMLElement`
 * (this project's test environment never registers `@openkakutou/web-ui-kit`'s
 * custom elements) has no such method, so this is a safe no-op there; the
 * real behavior is verified by a real-browser runtime pass instead. */
function readCameraSnapshot(viewport: HTMLElement): CameraSnapshotLike | null {
  const getCamera = (
    viewport as unknown as { getCamera?: () => CameraSnapshotLike }
  ).getCamera;
  return typeof getCamera === "function" ? getCamera.call(viewport) : null;
}

function buildFailureBanner(bodyText: string): HTMLElement {
  const banner = document.createElement("div");
  banner.className = "model-preview__error";
  banner.setAttribute("role", "status");
  const heading = document.createElement("p");
  heading.className = "model-preview__error-heading";
  heading.textContent = "3D preview unavailable";
  const body = document.createElement("p");
  body.className = "model-preview__error-body";
  body.textContent = bodyText;
  banner.append(heading, body);
  return banner;
}

// Tears down a previous call's three.js setup (renderer, observers,
// listeners, pending rAF) when `renderModelPreview` is invoked again on the
// same root — only a real asset swap does this (see .vibe/decisions/004,
// point 1); a plain field commit uses the returned handle instead.
const stopByRoot = new WeakMap<HTMLElement, () => void>();

export function renderModelPreview(
  root: HTMLElement,
  input: ModelPreviewInput | null,
  initialTransform: ModelTransform,
  initialCamera: CameraParams,
  options: ModelPreviewOptions = {},
): ModelPreviewHandle {
  stopByRoot.get(root)?.();
  stopByRoot.delete(root);

  root.replaceChildren();

  if (input === null) {
    return NOOP_HANDLE;
  }

  const createRendererFn = options.createRenderer ?? defaultCreateRenderer;
  const loadGLTFFn = options.loadGLTF ?? defaultLoadGLTF;
  const loadEnvironmentFn = options.loadEnvironment ?? defaultLoadEnvironment;
  const requestAnimationFrameFn =
    options.requestAnimationFrame ??
    globalThis.requestAnimationFrame.bind(globalThis);
  const cancelAnimationFrameFn =
    options.cancelAnimationFrame ??
    globalThis.cancelAnimationFrame.bind(globalThis);
  const ResizeObserverCtor =
    options.ResizeObserverCtor ??
    (typeof ResizeObserver !== "undefined" ? ResizeObserver : undefined);

  const viewport = document.createElement("wuik-viewport-3d");
  viewport.className = "model-preview__viewport";
  const canvas = document.createElement("canvas");
  canvas.className = "model-preview__canvas";
  viewport.appendChild(canvas);
  root.appendChild(viewport);

  let disposed = false;
  let rafHandle: number | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let scene: THREE.Scene | null = null;
  let modelRoot: THREE.Object3D | null = null;
  let resizeObserver: ResizeObserver | null = null;
  // The glTF load (and `three`/loader dynamic imports) is asynchronous, so a
  // field commit can land before `modelRoot`/`camera` exist yet — tracked
  // here rather than dropped, and applied once construction actually
  // completes below, so no edit made during that window is silently lost.
  let latestTransform = initialTransform;
  let latestCamera = initialCamera;

  stopByRoot.set(root, () => {
    disposed = true;
    if (rafHandle !== null) cancelAnimationFrameFn(rafHandle);
    resizeObserver?.disconnect();
    renderer?.dispose();
  });

  function requestRender(): void {
    if (rafHandle !== null || !renderer || !camera || !scene) return;
    const activeRenderer = renderer;
    const activeCamera = camera;
    const activeScene = scene;
    rafHandle = requestAnimationFrameFn(() => {
      rafHandle = null;
      if (disposed) return;
      applySurfaceColor(activeRenderer, canvas);
      activeRenderer.render(activeScene, activeCamera);
    });
  }

  function applySurfaceColor(
    activeRenderer: THREE.WebGLRenderer,
    surfaceCanvas: HTMLCanvasElement,
  ): void {
    // Re-read on every render, never cached from mount, so a live OS-level
    // prefers-color-scheme change is reflected immediately.
    const surfaceColor =
      getComputedStyle(surfaceCanvas)
        .getPropertyValue("--wuik-color-surface")
        .trim() || "#e5e5e5";
    try {
      activeRenderer.setClearColor(
        surfaceColor as unknown as THREE.ColorRepresentation,
      );
    } catch {
      // A CSS custom property this renderer's Color constructor can't parse
      // (e.g. unresolved under a test environment) — the previous clear
      // color stays in effect rather than throwing mid-render.
    }
  }

  const handle: ModelPreviewHandle = {
    updateTransform(transform) {
      latestTransform = transform;
      if (disposed || !modelRoot) return;
      modelRoot.position.set(...transform.position);
      modelRoot.scale.set(...transform.scale);
      requestRender();
    },
    updateCamera(cameraParams) {
      latestCamera = cameraParams;
      if (disposed || !camera) return;
      camera.fov = cameraParams.fov;
      camera.near = cameraParams.near;
      camera.far = cameraParams.far;
      camera.updateProjectionMatrix();
      requestRender();
    },
  };

  (async () => {
    const [rendererOutcome, gltfOutcome] = await Promise.allSettled([
      Promise.resolve(createRendererFn(canvas)),
      Promise.resolve(loadGLTFFn(input.modelBytes)),
    ]);
    if (disposed) return;

    const createdRenderer =
      rendererOutcome.status === "fulfilled" ? rendererOutcome.value : null;
    if (!createdRenderer) {
      root.replaceChildren(
        buildFailureBanner(
          "This browser or environment could not create a WebGL renderer for the 3D preview.",
        ),
      );
      return;
    }
    renderer = createdRenderer;

    if (gltfOutcome.status === "rejected") {
      renderer.dispose();
      renderer = null;
      root.replaceChildren(
        buildFailureBanner(
          `The 3D model could not be loaded: ${
            gltfOutcome.reason instanceof Error
              ? gltfOutcome.reason.message
              : String(gltfOutcome.reason)
          }`,
        ),
      );
      return;
    }
    const model = gltfOutcome.value;

    // Apply whatever the *latest* commit is, not the value captured when
    // this preview was first mounted — a field commit racing ahead of this
    // async load (see `latestTransform`/`latestCamera` above) must still
    // win, never be silently dropped.
    model.scene.position.set(...latestTransform.position);
    model.scene.scale.set(...latestTransform.scale);
    modelRoot = model.scene;

    const THREE_ = await import("three");
    if (disposed) return;

    scene = new THREE_.Scene();
    scene.add(model.scene);

    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    camera = new THREE_.PerspectiveCamera(
      latestCamera.fov,
      width / height,
      latestCamera.near,
      latestCamera.far,
    );

    if (input.environmentBytes !== null) {
      const env = await Promise.resolve(
        loadEnvironmentFn(renderer, input.environmentBytes),
      );
      if (disposed) return;
      if (env) scene.environment = env;
    }

    // `<wuik-viewport-3d>` owns the camera's own orbit *state* (its default:
    // target at the origin, distance 10, elevation π/3) — this three.js
    // `PerspectiveCamera` otherwise defaults to sitting at the world origin
    // facing -Z, which would clip straight through most models. Sync it
    // once from the viewport's own real starting state before the warm-up
    // render below.
    const initialSnapshot = readCameraSnapshot(viewport);
    if (initialSnapshot) {
      camera.position.set(
        initialSnapshot.position.x,
        initialSnapshot.position.y,
        initialSnapshot.position.z,
      );
      camera.lookAt(
        initialSnapshot.target.x,
        initialSnapshot.target.y,
        initialSnapshot.target.z,
      );
    }

    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));

    // Warm-up render, bypassing the demand-gate below on purpose: three.js
    // compiles shaders/materials on first draw, so the first *user-
    // triggered* render must not be the one that pays that stall.
    applySurfaceColor(renderer, canvas);
    renderer.render(scene, camera);

    viewport.addEventListener("wuik-viewport3d-change", (event) => {
      if (!camera) return;
      const detail = (event as CustomEvent<CameraSnapshotLike>).detail;
      camera.position.set(
        detail.position.x,
        detail.position.y,
        detail.position.z,
      );
      camera.lookAt(detail.target.x, detail.target.y, detail.target.z);
      requestRender();
    });

    renderer.domElement.addEventListener("webglcontextrestored", () => {
      requestRender();
    });

    if (ResizeObserverCtor) {
      resizeObserver = new ResizeObserverCtor((entries) => {
        const entry = entries[0];
        if (!entry || !renderer || !camera) return;
        const box = entry.contentBoxSize?.[0];
        const w = box?.inlineSize ?? 0;
        const h = box?.blockSize ?? 0;
        if (w <= 0 || h <= 0) return; // guards a 0×0 first observation before layout
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        requestRender();
      });
      resizeObserver.observe(viewport);
    }
  })();

  return handle;
}
