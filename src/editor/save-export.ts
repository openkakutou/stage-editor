import {
  type StageDocument,
  getStageDocument as defaultGetStageDocument,
  markStageDocumentSaved as defaultMarkStageDocumentSaved,
} from "../document/stage-document-store.ts";
// Save/export (backlog item 004): serializes the currently loaded stage
// (as edited in place by characteristics-editor.ts/elements-editor.ts —
// same document store object reference, no re-parse needed) back to `.def`
// bytes through the WASM bridge's write surface, and triggers a browser
// download of the result. Round-trip fidelity (byte-identical when
// unedited, minimal-diff when a single field changed) is a property of
// `stage`'s own `SerializeDef`, already proven at the bridge layer
// (`wasm/bridge.test.ts`'s own round-trip tests) — this module's own job
// is only to wire the UI to it faithfully and surface a failure clearly,
// never silently producing a corrupt or empty file.
import { onLocaleChange, t } from "../i18n/i18n.ts";
import {
  type WasmBridgeOptions,
  saveStage as defaultSaveStage,
} from "../wasm/bridge.ts";

/**
 * Triggers a browser download of `bytes` as `fileName` via a throwaway
 * object URL. Ported from `character-editor`'s own
 * `palettes/palette-editor.ts` — same shape, same cast rationale (`Blob`'s
 * TS lib type only accepts a `Uint8Array<ArrayBuffer>`, not the more
 * general `Uint8Array<ArrayBufferLike>` every `Uint8Array` value is typed
 * as by default; a real browser accepts any `Uint8Array` here regardless
 * of its backing buffer type).
 */
export function defaultTriggerDownload(
  bytes: Uint8Array,
  fileName: string,
): void {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export interface SaveExportOptions {
  /** Reads the currently loaded stage document. Defaults to the real document store; injectable for testing. */
  getStageDocument?: () => StageDocument | null;
  /** Serializes the stage back to `.def` bytes. Defaults to the real WASM bridge; injectable for testing. */
  saveStage?: typeof defaultSaveStage;
  /** Forwarded to the default saveStage; ignored if saveStage is overridden. */
  bridgeOptions?: WasmBridgeOptions;
  /** Triggers the browser download. Defaults to the real object-URL download; injectable for testing. */
  triggerDownload?: (bytes: Uint8Array, fileName: string) => void;
  /** Clears unsaved-changes tracking after a successful save. Defaults to the real document store; injectable for testing. */
  markStageDocumentSaved?: () => void;
}

export interface SaveExportHandle {
  /**
   * Runs the exact same export this button's own click handler runs — for
   * a caller that needs to trigger it from outside a click, e.g. the
   * keyboard shortcut dispatcher (backlog item 009). A no-op when no stage
   * is loaded, matching the button's own click handler.
   */
  triggerSaveExport(): void;
  /** The rendered button element, for a caller that needs to reflect its live shortcut binding on it (backlog item 009). */
  button: HTMLElement;
  /**
   * Stops this render's own locale-change retranslation (backlog item
   * 010). Unlike `lifebar-editor`'s equivalent (mounted once per app
   * session), this component is re-mounted on every new document load —
   * the caller must call this before discarding the returned handle for a
   * fresh one, the same "unbind before rebuilding" discipline `main.ts`
   * already applies to `bindShortcutLabel`'s own return value.
   */
  unsubscribeLocale(): void;
}

/**
 * What the status line currently shows — a small tagged description, not
 * pre-formatted text, so a locale change can re-format it in the new
 * language without re-running the save. See
 * .vibe/decisions/008-i18n-integration-approach.md.
 */
type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; fileName: string }
  | { kind: "error"; message: string };

/**
 * Renders a "Save / Export" button into `root`. Reads the currently loaded
 * document fresh on every click (rather than being handed a snapshot),
 * matching the document store's own "single place editor screens read
 * from and write back to" role — the click always saves whatever is
 * currently in the store, including edits made after this component was
 * first rendered.
 */
export function renderSaveExport(
  root: HTMLElement,
  options: SaveExportOptions = {},
): SaveExportHandle {
  root.replaceChildren();

  const getStageDocument = options.getStageDocument ?? defaultGetStageDocument;
  const saveStageFn = options.saveStage ?? defaultSaveStage;
  const triggerDownload = options.triggerDownload ?? defaultTriggerDownload;
  const markStageDocumentSaved =
    options.markStageDocumentSaved ?? defaultMarkStageDocumentSaved;

  const button = document.createElement("wuik-button");
  button.dataset.action = "save-export";
  button.textContent = t("actions.saveExport", "Save / Export");

  const status = document.createElement("p");
  status.className = "save-export__status";
  status.setAttribute("role", "status");

  let currentStatus: Status = { kind: "idle" };

  function applyStatus(): void {
    switch (currentStatus.kind) {
      case "idle":
        status.textContent = "";
        return;
      case "saving":
        status.textContent = t("saveExport.saving", "Saving…");
        return;
      case "saved":
        status.textContent = t("saveExport.saved", "Saved {{fileName}}.", {
          fileName: currentStatus.fileName,
        });
        return;
      case "error":
        // A raw error message from the WASM bridge (Go-side), not this
        // app's own UI copy — shown verbatim, never translated, same rule
        // as raw stage data. See .vibe/decisions/008.
        status.textContent = currentStatus.message;
        return;
    }
  }

  function triggerSaveExport(): void {
    const doc = getStageDocument();
    if (doc === null) return;

    currentStatus = { kind: "saving" };
    applyStatus();
    saveStageFn(doc.defBytes, doc.stage, options.bridgeOptions).then(
      (result) => {
        if (!result.ok) {
          currentStatus = { kind: "error", message: result.error };
          applyStatus();
          return;
        }
        triggerDownload(result.bytes, doc.fileName);
        markStageDocumentSaved();
        currentStatus = { kind: "saved", fileName: doc.fileName };
        applyStatus();
      },
    );
  }

  button.addEventListener("click", triggerSaveExport);

  root.append(button, status);

  const unsubscribeLocale = onLocaleChange(() => {
    button.textContent = t("actions.saveExport", "Save / Export");
    applyStatus();
  });

  return { triggerSaveExport, button, unsubscribeLocale };
}
