import { describe, expect, it, vi } from "vitest";
import type { LoadedModel } from "./model-preview.ts";
import { renderModelPreview } from "./model-preview.ts";

const modelBytes = new Uint8Array([1, 2, 3]);

const defaultTransform = { position: [0, 0, 0], scale: [1, 1, 1] } as const;
const defaultCamera = { fov: 45, near: 0.1, far: 10000 } as const;

/** A minimal fake WebGLRenderer exposing only the methods this module calls. */
function fakeRenderer() {
  return {
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement("canvas"),
    // biome-ignore lint/suspicious/noExplicitAny: minimal test double, not the real class
  } as any;
}

/** Captures the callback passed to `new ResizeObserver(cb)` for manual firing. */
function fakeResizeObserverCtor() {
  let capturedCallback: ResizeObserverCallback | null = null;
  const observe = vi.fn();
  const disconnect = vi.fn();
  class FakeResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      capturedCallback = cb;
    }
    observe = observe;
    disconnect = disconnect;
  }
  return {
    ctor: FakeResizeObserver as unknown as typeof ResizeObserver,
    observe,
    disconnect,
    fire: (entries: ResizeObserverEntry[]) =>
      capturedCallback?.(entries, {} as ResizeObserver),
  };
}

function loadedGltf() {
  return {
    scene: { position: { set: vi.fn() }, scale: { set: vi.fn() } },
  };
}

describe("renderModelPreview — no 3D content", () => {
  it("renders nothing and returns a no-op handle for a null input", () => {
    const root = document.createElement("div");
    root.appendChild(document.createElement("span"));
    const handle = renderModelPreview(
      root,
      null,
      defaultTransform,
      defaultCamera,
    );
    expect(root.children.length).toBe(0);
    expect(() => handle.updateTransform(defaultTransform)).not.toThrow();
    expect(() => handle.updateCamera(defaultCamera)).not.toThrow();
  });
});

describe("renderModelPreview — success path", () => {
  it("mounts a wuik-viewport-3d with a canvas and constructs a renderer from it", () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves — just checking mount

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );

    const viewport = root.querySelector("wuik-viewport-3d");
    expect(viewport).not.toBeNull();
    const canvas = viewport?.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(createRenderer).toHaveBeenCalledWith(canvas);
    expect(loadGLTF).toHaveBeenCalledWith(modelBytes);
  });

  it("shows a failure banner when the renderer can't be constructed (no WebGL)", async () => {
    const root = document.createElement("div");
    const createRenderer = vi.fn().mockReturnValue(null);

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer },
    );
    await vi.waitFor(() => {
      expect(root.querySelector(".model-preview__error")).not.toBeNull();
    });
    expect(root.querySelector("wuik-viewport-3d")).toBeNull();
  });

  it("shows a failure banner when the glTF fails to load, and disposes the renderer", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockRejectedValue(new Error("corrupt glTF"));

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );
    await vi.waitFor(() => {
      expect(root.querySelector(".model-preview__error")).not.toBeNull();
    });
    expect(renderer.dispose).toHaveBeenCalled();
  });

  it("performs a warm-up render once the glTF has loaded", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockResolvedValue(loadedGltf());

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );
    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
  });

  it("positions and scales the loaded model per the initial transform", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const gltf = loadedGltf();
    const loadGLTF = vi.fn().mockResolvedValue(gltf);

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      { position: [1, 2, 3], scale: [4, 5, 6] },
      defaultCamera,
      { createRenderer, loadGLTF },
    );
    await vi.waitFor(() => {
      expect(gltf.scene.position.set).toHaveBeenCalledWith(1, 2, 3);
    });
    expect(gltf.scene.scale.set).toHaveBeenCalledWith(4, 5, 6);
  });

  it("loads and applies the environment texture when .hdr bytes were given", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockResolvedValue(loadedGltf());
    const envTexture = {};
    const loadEnvironment = vi.fn().mockReturnValue(envTexture);
    const envBytes = new Uint8Array([9, 9]);

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: envBytes },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF, loadEnvironment },
    );
    await vi.waitFor(() => {
      expect(loadEnvironment).toHaveBeenCalledWith(renderer, envBytes);
    });
  });

  it("reads the viewport's own starting camera state once mounted, instead of leaving the camera at three.js's own default (world-origin) position", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockResolvedValue(loadedGltf());

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );
    const viewport = root.querySelector("wuik-viewport-3d") as HTMLElement & {
      getCamera?: () => unknown;
    };
    const getCamera = vi.fn().mockReturnValue({
      position: { x: 1, y: 2, z: 3 },
      target: { x: 0, y: 0, z: 0 },
    });
    viewport.getCamera = getCamera;

    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
    expect(getCamera).toHaveBeenCalled();
  });

  it("re-renders when the viewport-3d dispatches a camera-change event, coalesced through requestAnimationFrame", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockResolvedValue(loadedGltf());
    const rafState: { callback: FrameRequestCallback | null } = {
      callback: null,
    };
    const requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafState.callback = cb;
      return 1;
    });
    const cancelAnimationFrame = vi.fn();

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF, requestAnimationFrame, cancelAnimationFrame },
    );
    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
    renderer.render.mockClear();

    const viewport = root.querySelector("wuik-viewport-3d") as HTMLElement;
    viewport.dispatchEvent(
      new CustomEvent("wuik-viewport3d-change", {
        detail: {
          position: { x: 1, y: 2, z: 3 },
          target: { x: 0, y: 0, z: 0 },
        },
      }),
    );

    expect(requestAnimationFrame).toHaveBeenCalled();
    rafState.callback?.(0);
    expect(renderer.render).toHaveBeenCalledTimes(1);
  });

  it("keeps the renderer and camera in sync with the host's resized CSS size", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockResolvedValue(loadedGltf());
    const ro = fakeResizeObserverCtor();

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF, ResizeObserverCtor: ro.ctor },
    );
    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
    renderer.setSize.mockClear();

    ro.fire([
      {
        contentBoxSize: [{ inlineSize: 400, blockSize: 300 }],
        // biome-ignore lint/suspicious/noExplicitAny: minimal ResizeObserverEntry double
      } as any,
    ]);

    expect(renderer.setSize).toHaveBeenCalledWith(400, 300, false);
  });

  it("ignores a degenerate 0x0 resize observation instead of sizing the renderer to zero", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockResolvedValue(loadedGltf());
    const ro = fakeResizeObserverCtor();

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF, ResizeObserverCtor: ro.ctor },
    );
    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
    renderer.setSize.mockClear();

    ro.fire([
      {
        contentBoxSize: [{ inlineSize: 0, blockSize: 0 }],
        // biome-ignore lint/suspicious/noExplicitAny: minimal ResizeObserverEntry double
      } as any,
    ]);

    expect(renderer.setSize).not.toHaveBeenCalled();
  });

  it("re-renders when the WebGL context is restored after being lost", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockResolvedValue(loadedGltf());

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );
    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
    renderer.render.mockClear();

    renderer.domElement.dispatchEvent(new Event("webglcontextrestored"));

    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
  });

  it("disposes the previous renderer and stops listening when called again on the same root", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockResolvedValue(loadedGltf());

    renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );
    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });

    renderModelPreview(root, null, defaultTransform, defaultCamera);

    expect(renderer.dispose).toHaveBeenCalled();
    expect(root.children.length).toBe(0);
  });
});

describe("renderModelPreview — incremental update handle (decision 004: no reload on plain field commits)", () => {
  it("updateTransform mutates the already-loaded model in place and requests a render, without reloading the glTF", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const gltf = loadedGltf();
    const loadGLTF = vi.fn().mockResolvedValue(gltf);

    const handle = renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );
    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
    renderer.render.mockClear();
    loadGLTF.mockClear();

    handle.updateTransform({ position: [10, 20, 30], scale: [2, 2, 2] });

    expect(gltf.scene.position.set).toHaveBeenCalledWith(10, 20, 30);
    expect(gltf.scene.scale.set).toHaveBeenCalledWith(2, 2, 2);
    expect(loadGLTF).not.toHaveBeenCalled();
    expect(createRenderer).toHaveBeenCalledTimes(1);
  });

  it("updateCamera mutates the already-created camera's near/far/fov and requests a render, without recreating the renderer", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockResolvedValue(loadedGltf());

    const handle = renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );
    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
    renderer.render.mockClear();

    handle.updateCamera({ fov: 90, near: 1, far: 500 });

    await vi.waitFor(() => {
      expect(renderer.render).toHaveBeenCalled();
    });
    expect(createRenderer).toHaveBeenCalledTimes(1);
  });

  it("applies a transform committed before the glTF finishes loading, instead of silently dropping it (race with the async load)", async () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const gltf = loadedGltf();
    let resolveGltf!: (value: LoadedModel) => void;
    const loadGLTF = vi.fn(
      () =>
        new Promise<LoadedModel>((resolve) => {
          resolveGltf = resolve;
        }),
    );

    const handle = renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );

    // Commit lands while the glTF is still loading — modelRoot doesn't
    // exist yet, so this must be remembered, not dropped.
    handle.updateTransform({ position: [7, 8, 9], scale: [3, 3, 3] });
    // biome-ignore lint/suspicious/noExplicitAny: minimal test double, not the real THREE.Object3D
    resolveGltf(gltf as any);

    await vi.waitFor(() => {
      expect(gltf.scene.position.set).toHaveBeenCalledWith(7, 8, 9);
    });
    expect(gltf.scene.scale.set).toHaveBeenCalledWith(3, 3, 3);
  });

  it("updateTransform/updateCamera before the model has finished loading is a safe no-op", () => {
    const root = document.createElement("div");
    const renderer = fakeRenderer();
    const createRenderer = vi.fn().mockReturnValue(renderer);
    const loadGLTF = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves

    const handle = renderModelPreview(
      root,
      { modelBytes, environmentBytes: null },
      defaultTransform,
      defaultCamera,
      { createRenderer, loadGLTF },
    );

    expect(() =>
      handle.updateTransform({ position: [1, 1, 1], scale: [1, 1, 1] }),
    ).not.toThrow();
    expect(() => handle.updateCamera(defaultCamera)).not.toThrow();
  });
});
