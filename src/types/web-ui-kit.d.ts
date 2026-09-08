// Ambient module declaration for `@openkakutou/web-ui-kit` (backlog items
// 008, 009): the installed package (as of v0.11.1) still ships no `.d.ts` of
// its own -- its `package.json` "exports" only points at the built JS/CSS,
// so a named import (`CommandStack`, `ShortcutManager`) fails `tsc` with
// "implicitly has an 'any' type" even though it works fine at runtime and
// under Vitest. Declared here, scoped to only what this app actually
// imports by name, rather than a blanket `declare module
// "@openkakutou/web-ui-kit";` that would silently type everything else
// `any` too. The real fix (the package shipping its own declarations)
// belongs in `web-ui-kit` itself -- tracked there, not worked around by
// editing its published output from here. Ported from `lifebar-editor`'s
// own identical `src/types/web-ui-kit.d.ts`.
declare module "@openkakutou/web-ui-kit" {
  /** A do/undo pair a consumer registers with a {@link CommandStack}. */
  export interface Command {
    do(): void;
    undo(): void;
    coalesceKey?: string;
  }

  export interface CommandStackOptions {
    maxSize?: number;
    coalesceWindowMs?: number;
  }

  /** A framework-agnostic undo/redo history. See `web-ui-kit`'s own `src/history/command-stack.ts`. */
  export class CommandStack {
    constructor(options?: CommandStackOptions);
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    push(command: Command): void;
    undo(): boolean;
    redo(): boolean;
    clear(): void;
  }

  /** An action a consuming app registers with a {@link ShortcutManager}. See `web-ui-kit`'s own `src/shortcuts/shortcut-manager.ts`. */
  export interface ShortcutAction {
    id: string;
    label: string;
    defaultKey: string;
  }

  export interface ShortcutBinding {
    id: string;
    label: string;
    key: string;
    isDefault: boolean;
  }

  export type RebindResult =
    | { ok: true }
    | { ok: false; reason: "conflict"; conflictWith: string }
    | { ok: false; reason: "unknown-action" };

  export interface RebindOptions {
    swap?: boolean;
  }

  export interface ShortcutManagerOptions {
    storageKey?: string;
    storage?: Storage;
  }

  export type ShortcutChangeDetail = { id: string; key: string };

  /** A framework-agnostic, headless keyboard-shortcut manager. See `web-ui-kit`'s own `src/shortcuts/shortcut-manager.ts`. */
  export class ShortcutManager extends EventTarget {
    constructor(options?: ShortcutManagerOptions);
    register(action: ShortcutAction): void;
    list(): ShortcutBinding[];
    getBinding(id: string): string | undefined;
    rebind(id: string, key: string, options?: RebindOptions): RebindResult;
    resetToDefault(id: string): RebindResult;
  }

  /** `<wuik-shortcuts-panel>`'s element interface -- takes its manager through a JS property, not an attribute. See `web-ui-kit`'s own `src/shortcuts/shortcut-panel.ts`. No `HTMLElementTagNameMap` entry is added (unlike a real `.d.ts` might): this file is a plain ambient-module script, not a module itself, and `declare global` augmentation requires the latter. Callers cast `document.createElement("wuik-shortcuts-panel")` to this type explicitly instead, the same "as unknown as" shape `wasm/bridge.ts` already uses for an untyped global. */
  export class WuikShortcutsPanelElement extends HTMLElement {
    manager: ShortcutManager | undefined;
  }
}
