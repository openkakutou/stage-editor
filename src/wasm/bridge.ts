// Bridge to the `stage` WASM module: loads `wasm_exec.js`, instantiates
// `stage.wasm`, and exposes typed wrappers around the global
// `OpenKakutouStage.load`/`OpenKakutouStage.save` calls. This app is write
// mode, unlike `stage-viewer-web`'s read-only bridge — `saveStage` is the
// write-mode addition on top of the same loading strategy (injectable
// fetch, `Function`-executed `wasm_exec.js`, unawaited `go.run`) that
// bridge already established, itself mirroring
// `character-viewer-web`'s `.vibe/decisions/002-wasm-bridge-loading-and-result-shape.md`.
// See `stage`'s own `docs/wasm.md` for this module's JS contract
// (`{ stage, error }` for load, `{ bytes, error }` for save).
import type { SaveResult, StageData, StageResult } from "./types.ts";

const DEFAULT_WASM_EXEC_URL = "./wasm/wasm_exec.js";
const DEFAULT_WASM_BINARY_URL = "./wasm/stage.wasm";

/** The `Go` runtime instance `wasm_exec.js` (via `new globalThis.Go()`) produces. */
interface GoRuntime {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
}

/** The `{stage, error}` shape returned synchronously by `OpenKakutouStage.load`. */
interface RawLoadResult {
  stage: string | null;
  error: string | null;
}

/** The `{bytes, error}` shape returned synchronously by `OpenKakutouStage.save`. */
interface RawSaveResult {
  bytes: Uint8Array | null;
  error: string | null;
}

interface OpenKakutouStageGlobal {
  load(defBytes: Uint8Array): RawLoadResult;
  save(originalDefBytes: Uint8Array, editedStageJSON: string): RawSaveResult;
}

export interface WasmBridgeOptions {
  /** Fetches `wasm_exec.js`'s source text. Defaults to `fetch(DEFAULT_WASM_EXEC_URL)`. */
  fetchWasmExecSource?: () => Promise<string>;
  /** Fetches `stage.wasm`'s raw bytes. Defaults to `fetch(DEFAULT_WASM_BINARY_URL)`. */
  fetchWasmBytes?: () => Promise<Uint8Array>;
}

async function defaultFetchWasmExecSource(): Promise<string> {
  const response = await fetch(DEFAULT_WASM_EXEC_URL);
  if (!response.ok) {
    throw new Error(
      `failed to fetch ${DEFAULT_WASM_EXEC_URL}: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

async function defaultFetchWasmBytes(): Promise<Uint8Array> {
  const response = await fetch(DEFAULT_WASM_BINARY_URL);
  if (!response.ok) {
    throw new Error(
      `failed to fetch ${DEFAULT_WASM_BINARY_URL}: ${response.status} ${response.statusText}`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

function getGoConstructor(): new () => GoRuntime {
  return (globalThis as unknown as { Go: new () => GoRuntime }).Go;
}

function getOpenKakutouStage(): OpenKakutouStageGlobal {
  return (globalThis as unknown as { OpenKakutouStage: OpenKakutouStageGlobal })
    .OpenKakutouStage;
}

// Memoized across calls so repeated loadStage()/saveStage() calls don't
// re-fetch or re-instantiate the module. Reset between tests via
// resetWasmBridgeForTests.
let readyPromise: Promise<void> | null = null;

async function instantiateGoRuntime(options: WasmBridgeOptions): Promise<void> {
  const fetchWasmExecSource =
    options.fetchWasmExecSource ?? defaultFetchWasmExecSource;
  const fetchWasmBytes = options.fetchWasmBytes ?? defaultFetchWasmBytes;

  const wasmExecSource = await fetchWasmExecSource();
  // wasm_exec.js assigns `globalThis.Go = class {...}` itself — it never
  // relies on <script>/module top-level scoping — so executing its source
  // as a function body works identically in a real browser and under
  // jsdom/Node, without needing a DOM <script> element or a servable module
  // URL. See the ADR referenced above.
  new Function(wasmExecSource)();

  const go = new (getGoConstructor())();
  const wasmBytes = await fetchWasmBytes();
  const { instance } = await WebAssembly.instantiate(
    wasmBytes as BufferSource,
    go.importObject,
  );

  // Not awaited: Go's main() registers OpenKakutouStage synchronously
  // before blocking forever in select{} — awaiting go.run would hang since
  // main() never returns. See the ADR.
  go.run(instance);
}

function ensureGoRuntimeReady(options: WasmBridgeOptions): Promise<void> {
  if (!readyPromise) {
    readyPromise = instantiateGoRuntime(options).catch((err: unknown) => {
      // Allow a later call to retry instantiation instead of being stuck
      // with a permanently rejected memoized promise.
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

/** Resets the memoized WASM instantiation. Test-only. */
export function resetWasmBridgeForTests(): void {
  readyPromise = null;
}

/**
 * Loads a stage from raw `.def` file bytes via the `stage` WASM module,
 * returning a typed result instead of throwing on malformed/missing input.
 */
export async function loadStage(
  defBytes: Uint8Array,
  options: WasmBridgeOptions = {},
): Promise<StageResult> {
  await ensureGoRuntimeReady(options);

  const raw = getOpenKakutouStage().load(defBytes);

  if (raw.error !== null) {
    return { ok: false, error: raw.error };
  }
  if (raw.stage === null) {
    return {
      ok: false,
      error: "OpenKakutouStage.load returned neither a stage nor an error",
    };
  }

  const stage = JSON.parse(raw.stage) as StageData;
  return { ok: true, stage };
}

/**
 * Serializes an edited stage back to `.def` bytes via the `stage` WASM
 * module, returning a typed result instead of throwing on malformed input.
 *
 * `originalDefBytes` is the file's own previously loaded bytes — pass an
 * empty `Uint8Array` for a brand new stage with no original file yet. When
 * `editedStage` describes no real change from what `originalDefBytes`
 * itself parses to, the output is byte-exact to the original; otherwise
 * fresh text is generated, not preserving the original's comments/ordering.
 */
export async function saveStage(
  originalDefBytes: Uint8Array,
  editedStage: StageData,
  options: WasmBridgeOptions = {},
): Promise<SaveResult> {
  await ensureGoRuntimeReady(options);

  const raw = getOpenKakutouStage().save(
    originalDefBytes,
    JSON.stringify(editedStage),
  );

  if (raw.error !== null) {
    return { ok: false, error: raw.error };
  }
  if (raw.bytes === null) {
    return {
      ok: false,
      error: "OpenKakutouStage.save returned neither bytes nor an error",
    };
  }

  return { ok: true, bytes: raw.bytes };
}
