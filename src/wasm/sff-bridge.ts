// Bridge to the `sff` WASM module: loads `wasm_exec.js`, instantiates
// `sff.wasm`, and exposes a typed wrapper around the global
// `OpenKakutouSff.load` call — metadata only, never decoded pixel data,
// since this app only needs sprite metadata to validate a BG element's
// sprite reference against the loaded sheet (see
// .vibe/decisions/001-sff-wasm-bridged-directly-for-sprite-reference-validation.md).
// A second, independent WASM bridge from `bridge.ts` (which talks to
// `stage`'s own module): different global (`OpenKakutouSff`, not
// `OpenKakutouStage`), different memoized readiness state, different
// default asset paths (`public/wasm/sff/`, not `public/wasm/`). Ported
// field-for-field from `lifebar-editor`'s own `src/wasm/bridge.ts`.
import type { SpriteGroup } from "./sff-types.ts";

const DEFAULT_WASM_EXEC_URL = "./wasm/sff/wasm_exec.js";
const DEFAULT_WASM_BINARY_URL = "./wasm/sff/sff.wasm";

/** The `Go` runtime instance `wasm_exec.js` (via `new globalThis.Go()`) produces. */
interface GoRuntime {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
}

/** The `{spriteGroups, error}` shape returned synchronously by `OpenKakutouSff.load`. */
interface RawLoadResult {
  spriteGroups: string | null;
  error: string | null;
}

interface OpenKakutouSffGlobal {
  load(sffBytes: Uint8Array): RawLoadResult;
}

export interface SffWasmBridgeOptions {
  /** Fetches `wasm_exec.js`'s source text. Defaults to `fetch(DEFAULT_WASM_EXEC_URL)`. */
  fetchWasmExecSource?: () => Promise<string>;
  /** Fetches `sff.wasm`'s raw bytes. Defaults to `fetch(DEFAULT_WASM_BINARY_URL)`. */
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

function getOpenKakutouSff(): OpenKakutouSffGlobal {
  return (globalThis as unknown as { OpenKakutouSff: OpenKakutouSffGlobal })
    .OpenKakutouSff;
}

// Memoized across calls so repeated bridge calls don't re-fetch or
// re-instantiate the module. Reset between tests via resetSffWasmBridgeForTests.
let readyPromise: Promise<void> | null = null;

async function instantiateGoRuntime(
  options: SffWasmBridgeOptions,
): Promise<void> {
  const fetchWasmExecSource =
    options.fetchWasmExecSource ?? defaultFetchWasmExecSource;
  const fetchWasmBytes = options.fetchWasmBytes ?? defaultFetchWasmBytes;

  const wasmExecSource = await fetchWasmExecSource();
  // wasm_exec.js assigns `globalThis.Go = class {...}` itself — it never
  // relies on <script>/module top-level scoping — so executing its source
  // as a function body works identically in a real browser and under
  // jsdom/Node, without needing a DOM <script> element or a servable module
  // URL. Re-executing it here (this app's own `bridge.ts` already ran
  // `stage`'s copy) is harmless: it just redefines the same `Go` class.
  new Function(wasmExecSource)();

  const go = new (getGoConstructor())();
  const wasmBytes = await fetchWasmBytes();
  const { instance } = await WebAssembly.instantiate(
    wasmBytes as BufferSource,
    go.importObject,
  );

  // Not awaited: Go's main() registers OpenKakutouSff synchronously before
  // blocking forever in select{} — awaiting go.run would hang since main()
  // never returns.
  go.run(instance);
}

function ensureGoRuntimeReady(options: SffWasmBridgeOptions): Promise<void> {
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
export function resetSffWasmBridgeForTests(): void {
  readyPromise = null;
}

/** One decoded sprite sheet's metadata, or a descriptive error instead of throwing. */
export type SpriteSheetResult =
  | { ok: true; spriteGroups: SpriteGroup[] }
  | { ok: false; error: string };

/**
 * Loads a sprite sheet's metadata from raw `.sff` file bytes via the `sff`
 * WASM module, returning a typed result instead of throwing on
 * malformed/missing input.
 *
 * A failure to bring the WASM module itself up (missing/not-yet-downloaded
 * `public/wasm/sff/` assets, a network error) is a different failure mode
 * from a WASM-reported parse error, and is not represented in this
 * function's return type — it rejects instead, same as
 * `ensureGoRuntimeReady`'s own fetch effects.
 */
export async function loadSpriteSheet(
  sffBytes: Uint8Array,
  options: SffWasmBridgeOptions = {},
): Promise<SpriteSheetResult> {
  await ensureGoRuntimeReady(options);

  const raw = getOpenKakutouSff().load(sffBytes);

  if (raw.error !== null) {
    return { ok: false, error: raw.error };
  }
  if (raw.spriteGroups === null) {
    return {
      ok: false,
      error: "OpenKakutouSff.load returned neither sprite groups nor an error",
    };
  }

  const spriteGroups = JSON.parse(raw.spriteGroups) as SpriteGroup[];
  return { ok: true, spriteGroups };
}
