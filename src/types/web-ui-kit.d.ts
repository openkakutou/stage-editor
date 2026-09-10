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

  // -- Localization (i18n), backlog item 010 --------------------------------
  // `I18nInstance` below is a small structural subset of `i18next`'s own `i18n`
  // instance type, not an import of it: importing a type from "i18next" at the
  // top of this file (even type-only, even unused) makes `tsc` silently fail to
  // merge this `declare module` block into the real `@openkakutou/web-ui-kit`
  // import site in `src/i18n/i18n.ts` -- confirmed by the sibling
  // `lifebar-viewer-web`/`lifebar-editor` repos' own bisection for the same
  // gap, cause not otherwise diagnosed -- so this app avoids that combination
  // entirely rather than depending on unconfirmed compiler behavior.

  /** A key -> translated string catalog for one locale; values may nest
   * (looked up as `"a.b"`) -- i18next's own standard resource-bundle shape. */
  export type LocaleCatalogValue =
    | string
    | { [key: string]: LocaleCatalogValue };
  export type LocaleCatalog = Record<string, LocaleCatalogValue>;
  /** A locale code (`"en"`, `"fr"`, ...) -> catalog map. */
  export type LocaleCatalogs = Record<string, LocaleCatalog>;

  export interface InitI18nOptions {
    /** This app's own namespace -- must not be `"wuik"`, reserved for the kit's own catalog. */
    namespace: string;
    /** This app's own locale catalogs, keyed by locale code. */
    resources: LocaleCatalogs;
    storageKey?: string;
  }

  /** The subset of `i18next`'s own `i18n` instance surface this app
   * actually uses -- see the file-level note above for why this is a
   * structural interface rather than an import of `i18next`'s own type. */
  export interface I18nInstance {
    t(key: string, options?: Record<string, unknown>): string;
    changeLanguage(lng?: string): Promise<unknown>;
    on(event: "languageChanged", callback: () => void): void;
    off(event: "languageChanged", callback: () => void): void;
    readonly language: string;
    readonly resolvedLanguage: string | undefined;
    readonly isInitialized: boolean;
    readonly options: { resources?: Record<string, unknown> };
  }

  /** Creates and initializes a fresh i18next instance for this app. See `web-ui-kit`'s own `src/i18n/i18n.ts`. */
  export function initI18n(options: InitI18nOptions): Promise<I18nInstance>;
  /** The instance the last `initI18n` call produced, or `undefined` if no app in this page has called it yet. */
  export function getI18n(): I18nInstance | undefined;
  /** Subscribes to every locale change on whichever instance is active at the time of the change. Returns an unsubscribe function. */
  export function onLocaleChange(callback: () => void): () => void;

  /** `<wuik-locale-switcher>`'s element interface -- takes its instance
   * through a JS property, not an attribute. See `web-ui-kit`'s own
   * `src/i18n/locale-switcher.ts`. No `HTMLElementTagNameMap` entry is added
   * (unlike a real `.d.ts` might) for the same reason as
   * `WuikShortcutsPanelElement` above. Callers cast
   * `document.createElement("wuik-locale-switcher")` to this type explicitly
   * instead. */
  export class WuikLocaleSwitcherElement extends HTMLElement {
    i18n: I18nInstance | undefined;
  }
}
