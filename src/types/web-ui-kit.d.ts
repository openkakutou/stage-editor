// Ambient module declaration for `@openkakutou/web-ui-kit` (backlog item
// 008): the installed package (v0.6.0) ships no `.d.ts` of its own -- its
// `package.json` "exports" only points at the built JS/CSS, so a named
// import (`CommandStack`) fails `tsc` with "implicitly has an 'any' type"
// even though it works fine at runtime and under Vitest. Declared here,
// scoped to only what this app actually imports by name, rather than a
// blanket `declare module "@openkakutou/web-ui-kit";` that would silently
// type everything else `any` too. The real fix (the package shipping its
// own declarations) belongs in `web-ui-kit` itself -- tracked there, not
// worked around by editing its published output from here. Ported from
// `lifebar-editor`'s own identical `src/types/web-ui-kit.d.ts`, trimmed to
// only the `CommandStack` surface this app actually uses.
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
}
