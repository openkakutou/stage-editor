---
date: 2026-08-26
status: accepted
---
# Bridge `sff`'s own WASM module directly, in a separate output subdirectory

**Context:** The BG element editor (backlog item 003) must validate a sprite reference against the loaded stage's actual sprite sheet (acceptance criterion: an unknown reference shows a clear error, not a silent accept). `stage`'s own WASM entrypoint only exposes `load`/`save` on the `Stage` data model — it has no sprite-metadata surface at all yet (tracked separately as `stage`'s own backlog item `010-expose-sprite-pixel-resolution-via-wasm.md`, still `status: todo`). `sff` — the library stage's own Go code already depends on for sprite decoding — publishes its own standalone WASM build, already consumed the same way by `lifebar-editor` (which has no primary domain-library WASM module of its own to embed it into).

**Decision:** Bridge `sff`'s WASM module (`OpenKakutouSff.load`, metadata only — no pixel decode, not needed for reference validation) directly in this app, mirroring `lifebar-editor`'s own `src/wasm/bridge.ts` field-for-field. Its release assets (`sff.wasm` + its own `wasm_exec.js`) download into a separate subdirectory, `public/wasm/sff/`, via a second download script — never into the same `public/wasm/` directory `stage`'s own assets already occupy, since both a `stage.wasm` and an `sff.wasm` release each ship a `wasm_exec.js` of their own, and a `wasm_exec.js` is only guaranteed compatible with the exact Go toolchain version that built the specific `.wasm` binary next to it — reusing one copy for both would work today only by coincidence (both currently pinned to Go 1.26.1) and silently break the moment either repo's Go version drifts from the other's, independently.

**Reason:** This is the first app in the org needing two independently-versioned Go WASM modules loaded client-side at once. Waiting on `stage#010` was rejected: that item is about exposing decoded sprite *pixels* for rendering, not enumerating which `(group, image)` pairs exist — even once it lands, validating a reference still needs sprite *metadata* enumeration, which `sff`'s own already-shipped `load` call already provides today, with a proven, tested integration pattern (`lifebar-editor`) to port rather than invent.

**Rejected alternatives:**
- **Wait on `stage#010`:** rejected — doesn't actually solve reference *validation* (metadata enumeration), only pixel decoding for rendering; an open-ended cross-repo wait for a capability this item doesn't need.
- **Reuse `stage`'s own `wasm_exec.js` for both modules:** rejected — couples the two producer repos' Go toolchain versions together implicitly, a fragile assumption that happens to hold today but isn't guaranteed by anything.
- **Skip reference validation, accept any `(group, image)` pair silently:** rejected — directly contradicts this item's own acceptance criteria.
