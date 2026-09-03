// BG element/layer editor (backlog item 003): add, edit, and remove a
// stage's BG elements. The second of this item's two editing screens (the
// other being characteristics-editor.ts).
//
// Edits mutate the given `StageData`'s `elements` array in place, the same
// "caller-owned document" shape characteristics-editor.ts and
// `lifebar-editor`'s own elements-editor.ts already established.
//
// A row is collapsed by default, one summary line per element, expandable
// individually — several rows can be open at once, and adding a new
// element auto-expands only that new row, per plan consultation (never
// collapse the user's existing place in a multi-element list). `expandedRows`
// is owned by the caller and passed back in on every re-render (same shape
// lifebar-editor's `elements-editor.ts` uses for its own `expandedSections`)
// so it survives across the full-list rebuilds a structural change (type
// switch, add, remove) triggers.
//
// A field irrelevant to an element's current type (the sprite reference for
// "anim", the action number for "normal"/"parallax", the parallax delta for
// anything but "parallax") is hidden, never shown-but-disabled — switching
// away from a type never clears that field's underlying value, only stops
// rendering/using it, so toggling back restores it unchanged. This matches
// `stage`'s own Serialize behavior, which already writes `Sprite` only for
// "normal"/"parallax" and `ActionNumber` only for "anim" regardless of what
// else is sitting in the struct — see that repo's `docs/data-model.md`.
//
// Removing an element with any edited field requires an inline confirm step
// (not a native `confirm()`); a freshly-added, still-untouched element is
// removed with a single click. "Touched" is tracked per element object by
// reference (`touchedElements`, a `WeakSet`) rather than by comparing
// current values to their defaults — a value-equality heuristic a user
// could accidentally satisfy (per plan consultation).
//
// Only structural changes (type switch, add, remove) rebuild the whole
// list; a plain field's own commit (always on `blur`, so focus has already
// moved on) updates just that element and its own row's summary text in
// place — rebuilding the whole list on every blur would risk interfering
// with the browser's own focus-move sequencing mid-Tab.
//
// Batch multi-select editing (backlog item 007): each row gets a checkbox,
// selected by object reference (`ElementsEditorOptions.selectedElements`,
// not index — see that field's own doc comment and
// .vibe/decisions/005-bg-element-batch-selection-model-and-scope.md). A
// batch toolbar (`renderBatchToolbar`, below) appears only once the
// selection is non-empty, showing which elements are affected and letting
// the user apply a shared position offset or sprite reassignment to all of
// them at once via `bg-element-batch-edit.ts`'s pure functions. Toggling
// selection updates just the affected rows' own visual state (never a full
// rebuild — this matters at the "hundreds of BG elements" scale the
// feature exists for); applying a batch action does trigger a full
// `rerender()`, same as any other structural change, since it can touch
// many rows' displayed values at once.
import type { Sprite, SpriteGroup } from "../wasm/sff-types.ts";
import type {
  BGElement,
  BGElementType,
  SpriteRef,
  StageData,
} from "../wasm/types.ts";
import {
  applyPositionOffset,
  applySpriteReassignment,
} from "./bg-element-batch-edit.ts";

export interface ElementsEditorOptions {
  /**
   * Which rows are expanded, by index into `stage.elements`. The caller
   * should pass the same Set instance across re-renders so the user's
   * place is preserved. A fresh Set is used if omitted (everything starts
   * collapsed).
   */
  expandedRows?: Set<number>;
  /**
   * Which elements are selected for batch editing (backlog item 007),
   * tracked by object reference rather than index — deleting a row from
   * `stage.elements` never needs to reindex this set, since nothing here
   * depends on an index staying valid across the array's own mutations.
   * The caller should pass the same Set instance across re-renders, same
   * convention as `expandedRows`. See
   * `.vibe/decisions/005-bg-element-batch-selection-model-and-scope.md`.
   */
  selectedElements?: Set<BGElement>;
  /** Called after any committed edit — add, remove, a field change, or a batch apply. */
  onChange?: () => void;
}

const UNSET_SPRITE: SpriteRef = Object.freeze({ group: -1, image: -1 });

function blankElement(): BGElement {
  return {
    name: "",
    type: "normal",
    sprite: { ...UNSET_SPRITE },
    actionNumber: 0,
    layerNo: 0,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    tileX: 0,
    tileY: 0,
    tileSpacingX: 0,
    tileSpacingY: 0,
  };
}

// Tracked by object reference: the same `BGElement` object stays the same
// reference across every re-render (in-place mutation, never a copy), so a
// WeakSet keyed on it survives this module's own re-renders without any
// separate stable-id bookkeeping. Module-level (not per-call) so it
// persists across the full-list rebuilds a structural change triggers.
const touchedElements = new WeakSet<BGElement>();

// The last row individually clicked/selected (not via a Shift-extended
// range), the anchor a later Shift+click/Shift+Space range-select measures
// from — same file-manager convention as Explorer/Finder. Module-level for
// the same reason as `touchedElements` above: it must survive this file's
// own full-list re-renders. `null` once nothing has ever been individually
// clicked, or after the anchor row itself was removed.
let lastClickedElement: BGElement | null = null;

type SpriteRefStatus =
  | { kind: "unset" }
  | { kind: "loading" }
  | { kind: "valid"; sprite: Sprite }
  | { kind: "invalid" };

function resolveSpriteRefStatus(
  ref: SpriteRef,
  spriteGroups: SpriteGroup[] | null,
): SpriteRefStatus {
  if (ref.group === -1 && ref.image === -1) return { kind: "unset" };
  if (spriteGroups === null) return { kind: "loading" };
  for (const group of spriteGroups) {
    for (const sprite of group.sprites) {
      if (sprite.group === ref.group && sprite.image === ref.image) {
        return { kind: "valid", sprite };
      }
    }
  }
  return { kind: "invalid" };
}

export function renderElementsEditor(
  root: HTMLElement,
  stage: StageData | null,
  spriteGroups: SpriteGroup[] | null,
  options: ElementsEditorOptions = {},
): void {
  root.replaceChildren();
  if (stage === null) return;
  // Captured as its own binding (not just narrowed) so nested closures below
  // keep the non-null type — TS narrowing from the early return above
  // doesn't survive into a closure over the wider-typed parameter.
  const loadedStage = stage;

  const expandedRows = options.expandedRows ?? new Set<number>();
  const selectedElements = options.selectedElements ?? new Set<BGElement>();
  const onChange = options.onChange ?? (() => {});

  const panel = document.createElement("wuik-panel");
  panel.className = "elements-editor";

  function elements(): BGElement[] {
    if (loadedStage.elements === null) loadedStage.elements = [];
    return loadedStage.elements;
  }

  function rerender(): void {
    renderElementsEditor(root, stage, spriteGroups, {
      expandedRows,
      selectedElements,
      onChange,
    });
  }

  const heading = document.createElement("h2");
  heading.textContent = `BG Elements (${elements().length})`;
  panel.appendChild(heading);

  const toolbarContainer = document.createElement("div");
  panel.appendChild(toolbarContainer);

  // Row DOM/checkbox references, keyed by element -- lets a selection
  // change update just the affected rows (a plain click: 1 row; a
  // Shift-extended range: however many it spans) instead of rebuilding the
  // whole list, which matters at the "hundreds of BG elements" scale this
  // feature exists for.
  const rowRefs = new Map<
    BGElement,
    { row: HTMLElement; checkbox: HTMLInputElement }
  >();

  function refreshRowSelectionVisual(el: BGElement): void {
    const refs = rowRefs.get(el);
    if (!refs) return;
    const selected = selectedElements.has(el);
    refs.row.classList.toggle("elements-editor__row--selected", selected);
    refs.checkbox.checked = selected;
  }

  function refreshBatchToolbar(): void {
    renderBatchToolbar(toolbarContainer, {
      elements: elements(),
      spriteGroups,
      selectedElements,
      onClearSelection: () => {
        for (const el of selectedElements) {
          selectedElements.delete(el);
          refreshRowSelectionVisual(el);
        }
        refreshBatchToolbar();
      },
      onApplyOffset: (deltaX, deltaY) => {
        const indices = selectedElementIndices(elements(), selectedElements);
        applyPositionOffset(elements(), indices, deltaX, deltaY);
        onChange();
        rerender();
      },
      onApplySprite: (sprite) => {
        const indices = selectedElementIndices(elements(), selectedElements);
        applySpriteReassignment(elements(), indices, sprite);
        onChange();
        rerender();
      },
    });
  }

  /**
   * Shift+click/Shift+Space: selects the contiguous range from the last
   * individually-selected row to `el`, forcing every row in the range
   * (including the one actually clicked) to `checked = true` regardless of
   * its prior state. The caller must not call `preventDefault` on a mouse
   * Shift+click that reaches this function (see that call site's own
   * comment) — the same checkbox activation quirk documented on
   * `handleSelectSingle` applies to the directly-clicked box here too, not
   * only to keyboard Space; the browser's own tentative pre-click toggle
   * would otherwise get reverted right after this function's own
   * `checkbox.checked = true` runs.
   */
  function handleSelectRange(el: BGElement): void {
    const currentEls = elements();
    const anchorIndex =
      lastClickedElement !== null ? currentEls.indexOf(lastClickedElement) : -1;
    const targetIndex = currentEls.indexOf(el);

    if (anchorIndex === -1 || targetIndex === -1) {
      handleSelectSingle(el, !selectedElements.has(el));
      return;
    }
    const [start, end] =
      anchorIndex < targetIndex
        ? [anchorIndex, targetIndex]
        : [targetIndex, anchorIndex];
    for (let i = start; i <= end; i++) {
      selectedElements.add(currentEls[i]);
      refreshRowSelectionVisual(currentEls[i]);
    }
    refreshBatchToolbar();
  }

  /**
   * A plain (non-Shift) click or Space: syncs the selection to the
   * checkbox's own new `isChecked` value instead of computing a toggle
   * independently. Deliberately never calls `preventDefault` on the
   * triggering event — doing so on a Space-*activated* checkbox reverts
   * its `.checked` back to the pre-activation value once the event
   * finishes (the checkbox's own "canceled activation steps"), regardless
   * of what this function sets it to in the meantime. Letting the native
   * toggle stand and reading it back here sidesteps that entirely; a mouse
   * click's native toggle already agrees with `isChecked` too, so this is
   * correct for both input methods.
   */
  function handleSelectSingle(el: BGElement, isChecked: boolean): void {
    if (isChecked) {
      selectedElements.add(el);
    } else {
      selectedElements.delete(el);
    }
    lastClickedElement = el;
    refreshRowSelectionVisual(el);
    refreshBatchToolbar();
  }

  const list = document.createElement("div");
  list.className = "elements-editor__list";
  elements().forEach((el, index) => {
    const remove = () => {
      elements().splice(index, 1);
      expandedRows.delete(index);
      selectedElements.delete(el);
      if (lastClickedElement === el) lastClickedElement = null;
      onChange();
      rerender();
    };
    const { row, checkbox } = buildRow(
      el,
      index,
      expandedRows,
      spriteGroups,
      rerender,
      onChange,
      remove,
      selectedElements.has(el),
      handleSelectSingle,
      handleSelectRange,
    );
    rowRefs.set(el, { row, checkbox });
    list.appendChild(row);
  });
  panel.appendChild(list);

  refreshBatchToolbar();

  const addButton = document.createElement("wuik-button");
  addButton.setAttribute("variant", "secondary");
  addButton.dataset.action = "add-element";
  addButton.textContent = "Add element";
  addButton.addEventListener("click", () => {
    const el = blankElement();
    const list = elements();
    list.push(el);
    expandedRows.add(list.length - 1);
    onChange();
    rerender();
  });
  panel.appendChild(addButton);

  root.appendChild(panel);
}

/** Resolves the selection's current array indices, freshly, against `elements` -- never stale, since selection is tracked by object reference. */
function selectedElementIndices(
  elements: BGElement[],
  selectedElements: ReadonlySet<BGElement>,
): Set<number> {
  const indices = new Set<number>();
  for (const el of selectedElements) {
    const index = elements.indexOf(el);
    if (index !== -1) indices.add(index);
  }
  return indices;
}

function buildRow(
  el: BGElement,
  index: number,
  expandedRows: Set<number>,
  spriteGroups: SpriteGroup[] | null,
  rerender: () => void,
  onChange: () => void,
  remove: () => void,
  selected: boolean,
  onSelectSingle: (el: BGElement, isChecked: boolean) => void,
  onSelectRange: (el: BGElement) => void,
): { row: HTMLElement; checkbox: HTMLInputElement } {
  const row = document.createElement("div");
  row.className = "elements-editor__row";
  row.classList.toggle("elements-editor__row--selected", selected);

  const header = document.createElement("div");
  header.className = "elements-editor__header";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "elements-editor__select";
  checkbox.dataset.action = "select-element";
  checkbox.checked = selected;
  checkbox.setAttribute(
    "aria-label",
    `Select ${el.name || "(unnamed)"} for batch editing`,
  );
  // Neither branch calls `preventDefault` -- doing so on *either* a plain
  // or a Shift-modified checkbox click/Space triggers the browser's own
  // "canceled activation steps", which revert `.checked` back to its
  // pre-activation value right after this listener returns, regardless of
  // what JS sets it to in the meantime (a real, confirmed-in-browser
  // checkbox quirk, not jsdom-testable -- see docs/testing.md). Letting
  // the native toggle stand and either reading it back (onSelectSingle) or
  // deterministically overwriting it for the whole range (onSelectRange,
  // which sets every affected row including this one to `checked = true`
  // itself) sidesteps that entirely for both input methods.
  checkbox.addEventListener("click", (event) => {
    if ((event as MouseEvent).shiftKey) {
      onSelectRange(el);
      return;
    }
    onSelectSingle(el, checkbox.checked);
  });
  checkbox.addEventListener("keydown", (event) => {
    // Space normally synthesizes a native click, which the listener above
    // already handles -- this only needs to catch Shift+Space, since a
    // plain Space's synthetic click may not reliably carry the Shift
    // modifier across browsers the way a real mouse Shift+click does.
    // preventDefault here suppresses that synthetic click outright, so the
    // two listeners never both fire for the same keypress.
    if (event.key === " " && event.shiftKey) {
      event.preventDefault();
      onSelectRange(el);
    }
  });
  header.appendChild(checkbox);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "elements-editor__toggle";
  const expanded = expandedRows.has(index);
  toggle.setAttribute("aria-expanded", String(expanded));

  const summary = document.createElement("span");
  summary.className = "elements-editor__summary";
  updateSummaryText(summary, el, spriteGroups);
  toggle.appendChild(summary);

  const body = document.createElement("div");
  body.className = "elements-editor__body";
  body.hidden = !expanded;
  buildBody(body, el, spriteGroups, summary, rerender, onChange);

  toggle.addEventListener("click", () => {
    const nowExpanded = body.hidden;
    body.hidden = !nowExpanded;
    toggle.setAttribute("aria-expanded", String(nowExpanded));
    if (nowExpanded) expandedRows.add(index);
    else expandedRows.delete(index);
  });

  header.appendChild(toggle);
  row.append(header, body);

  const removeArea = document.createElement("div");
  removeArea.className = "elements-editor__remove-area";
  buildRemoveControl(removeArea, el, remove);
  row.appendChild(removeArea);

  return { row, checkbox };
}

function updateSummaryText(
  summary: HTMLElement,
  el: BGElement,
  spriteGroups: SpriteGroup[] | null,
): void {
  const parts = [
    el.name || "(unnamed)",
    el.type,
    `layer ${el.layerNo}`,
    `(${el.startX}, ${el.startY})`,
  ];
  if (el.type === "normal" || el.type === "parallax") {
    const status = resolveSpriteRefStatus(el.sprite, spriteGroups);
    parts.push(
      status.kind === "invalid"
        ? "invalid sprite reference"
        : status.kind === "unset"
          ? "no sprite assigned"
          : `sprite ${el.sprite.group},${el.sprite.image}`,
    );
  }
  summary.textContent = parts.join(" · ");
}

function buildRemoveControl(
  container: HTMLElement,
  el: BGElement,
  remove: () => void,
): void {
  function renderIdle(): void {
    container.replaceChildren();
    const removeButton = document.createElement("wuik-button");
    removeButton.setAttribute("variant", "secondary");
    removeButton.dataset.action = "remove-element";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      if (touchedElements.has(el)) {
        renderConfirm();
      } else {
        remove();
      }
    });
    container.appendChild(removeButton);
  }

  function renderConfirm(): void {
    container.replaceChildren();
    const prompt = document.createElement("span");
    prompt.className = "elements-editor__remove-confirm-prompt";
    prompt.textContent = "Remove this element?";
    const confirmButton = document.createElement("wuik-button");
    confirmButton.setAttribute("variant", "danger");
    confirmButton.dataset.action = "confirm-remove-element";
    confirmButton.textContent = "Confirm remove";
    confirmButton.addEventListener("click", remove);
    const cancelButton = document.createElement("wuik-button");
    cancelButton.setAttribute("variant", "secondary");
    cancelButton.dataset.action = "cancel-remove-element";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", renderIdle);
    container.append(prompt, confirmButton, cancelButton);
  }

  renderIdle();
}

function buildBody(
  body: HTMLElement,
  el: BGElement,
  spriteGroups: SpriteGroup[] | null,
  summary: HTMLElement,
  rerender: () => void,
  onChange: () => void,
): void {
  function touch(): void {
    touchedElements.add(el);
  }

  body.appendChild(
    buildTextField("name", "Name", el.name, (value) => {
      el.name = value;
      touch();
      updateSummaryText(summary, el, spriteGroups);
      onChange();
    }),
  );

  const typeSelect = document.createElement("select");
  typeSelect.className = "elements-editor__input";
  typeSelect.dataset.field = "type";
  for (const value of ["normal", "parallax", "anim"] as BGElementType[]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    typeSelect.appendChild(option);
  }
  typeSelect.value = el.type;
  typeSelect.addEventListener("change", () => {
    el.type = typeSelect.value as BGElementType;
    touch();
    onChange();
    rerender();
  });
  body.appendChild(wrapField("Type", typeSelect));

  if (el.type === "normal" || el.type === "parallax") {
    body.appendChild(
      buildSpritePicker(el, spriteGroups, summary, () => {
        touch();
        onChange();
      }),
    );
  }
  if (el.type === "anim") {
    body.appendChild(
      buildNumericField(
        "actionNumber",
        "Action number",
        el.actionNumber,
        (v) => {
          el.actionNumber = v;
          touch();
          onChange();
        },
      ),
    );
  }

  const layerSelect = document.createElement("select");
  layerSelect.className = "elements-editor__input";
  layerSelect.dataset.field = "layerNo";
  for (const [value, label] of [
    ["0", "Behind characters"],
    ["1", "In front of characters"],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    layerSelect.appendChild(option);
  }
  layerSelect.value = String(el.layerNo);
  layerSelect.addEventListener("change", () => {
    el.layerNo = Number(layerSelect.value);
    touch();
    updateSummaryText(summary, el, spriteGroups);
    onChange();
  });
  body.appendChild(wrapField("Layer", layerSelect));

  body.appendChild(
    buildNumericField("startX", "Start X", el.startX, (v) => {
      el.startX = v;
      touch();
      updateSummaryText(summary, el, spriteGroups);
      onChange();
    }),
  );
  body.appendChild(
    buildNumericField("startY", "Start Y", el.startY, (v) => {
      el.startY = v;
      touch();
      updateSummaryText(summary, el, spriteGroups);
      onChange();
    }),
  );

  if (el.type === "parallax") {
    body.appendChild(
      buildNumericField("deltaX", "Parallax delta X", el.deltaX, (v) => {
        el.deltaX = v;
        touch();
        onChange();
      }),
    );
    body.appendChild(
      buildNumericField("deltaY", "Parallax delta Y", el.deltaY, (v) => {
        el.deltaY = v;
        touch();
        onChange();
      }),
    );
  }

  body.appendChild(
    buildNumericField("tileX", "Tile X count", el.tileX, (v) => {
      el.tileX = v;
      touch();
      onChange();
    }),
  );
  body.appendChild(
    buildNumericField("tileY", "Tile Y count", el.tileY, (v) => {
      el.tileY = v;
      touch();
      onChange();
    }),
  );
  body.appendChild(
    buildNumericField(
      "tileSpacingX",
      "Tile spacing X",
      el.tileSpacingX,
      (v) => {
        el.tileSpacingX = v;
        touch();
        onChange();
      },
    ),
  );
  body.appendChild(
    buildNumericField(
      "tileSpacingY",
      "Tile spacing Y",
      el.tileSpacingY,
      (v) => {
        el.tileSpacingY = v;
        touch();
        onChange();
      },
    ),
  );
}

function wrapField(label: string, control: HTMLElement): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "elements-editor__field";
  const labelEl = document.createElement("label");
  labelEl.className = "elements-editor__label";
  labelEl.textContent = label;
  labelEl.appendChild(control);
  wrapper.appendChild(labelEl);
  return wrapper;
}

function buildTextField(
  field: string,
  label: string,
  initialValue: string,
  commit: (value: string) => void,
): HTMLElement {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "elements-editor__input";
  input.dataset.field = field;
  input.value = initialValue;
  input.addEventListener("input", () => commit(input.value));
  return wrapField(label, input);
}

function buildNumericField(
  field: string,
  label: string,
  initialValue: number,
  commit: (value: number) => void,
): HTMLElement {
  const input = document.createElement("input");
  input.type = "number";
  input.step = "any";
  input.className = "elements-editor__input";
  input.dataset.field = field;
  input.value = String(initialValue);

  const errorEl = document.createElement("span");
  errorEl.className = "elements-editor__field-error";
  errorEl.hidden = true;

  input.addEventListener("blur", () => {
    const value = Number(input.value);
    if (input.value.trim() === "" || Number.isNaN(value)) {
      input.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      errorEl.hidden = false;
      errorEl.textContent = `${label} must be a number.`;
      return;
    }
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    errorEl.hidden = true;
    commit(value);
  });

  const wrapper = wrapField(label, input);
  wrapper.appendChild(errorEl);
  return wrapper;
}

const UNSET_OPTION_VALUE = "-1,-1";

function buildSpritePicker(
  el: BGElement,
  spriteGroups: SpriteGroup[] | null,
  summary: HTMLElement,
  onCommit: () => void,
): HTMLElement {
  const select = document.createElement("select");
  select.className = "elements-editor__input";
  select.dataset.field = "sprite";

  const status = resolveSpriteRefStatus(el.sprite, spriteGroups);

  if (status.kind === "loading") {
    select.disabled = true;
    const option = document.createElement("option");
    option.textContent = "Loading sprite sheet…";
    select.appendChild(option);
    return wrapField("Sprite reference", select);
  }

  const placeholder = document.createElement("option");
  placeholder.value = UNSET_OPTION_VALUE;
  placeholder.textContent =
    status.kind === "invalid"
      ? `Invalid reference: ${el.sprite.group},${el.sprite.image}`
      : "— none —";
  select.appendChild(placeholder);

  for (const group of spriteGroups ?? []) {
    for (const sprite of group.sprites) {
      const option = document.createElement("option");
      const optionValue = `${sprite.group},${sprite.image}`;
      option.value = optionValue;
      option.textContent = `${sprite.group}, ${sprite.image} (${sprite.width}×${sprite.height})`;
      select.appendChild(option);
    }
  }

  select.value =
    status.kind === "valid"
      ? `${status.sprite.group},${status.sprite.image}`
      : status.kind === "unset"
        ? UNSET_OPTION_VALUE
        : UNSET_OPTION_VALUE;

  if (status.kind === "invalid") {
    select.classList.add("is-invalid");
    select.setAttribute("aria-invalid", "true");
  }

  const errorEl = document.createElement("span");
  errorEl.className = "elements-editor__field-error";
  errorEl.hidden = status.kind !== "invalid";
  if (status.kind === "invalid") {
    errorEl.textContent = `"${el.sprite.group},${el.sprite.image}" does not match any sprite in the loaded sheet.`;
  }

  select.addEventListener("change", () => {
    if (select.value === UNSET_OPTION_VALUE) {
      el.sprite = { ...UNSET_SPRITE };
    } else {
      const [group, image] = select.value.split(",").map(Number);
      el.sprite = { group, image };
    }
    select.classList.remove("is-invalid");
    select.removeAttribute("aria-invalid");
    errorEl.hidden = true;
    updateSummaryText(summary, el, spriteGroups);
    onCommit();
  });

  const wrapper = wrapField("Sprite reference", select);
  wrapper.appendChild(errorEl);
  return wrapper;
}

/** The batch sprite `<select>`'s own "nothing chosen yet" sentinel -- distinct from `UNSET_OPTION_VALUE` ("-1,-1"), which is itself a meaningful, applyable choice here (clear every selected element's sprite in one action). */
const BATCH_SPRITE_NOT_CHOSEN = "";

interface BatchToolbarOptions {
  elements: BGElement[];
  spriteGroups: SpriteGroup[] | null;
  selectedElements: ReadonlySet<BGElement>;
  onClearSelection: () => void;
  onApplyOffset: (deltaX: number, deltaY: number) => void;
  onApplySprite: (sprite: SpriteRef) => void;
}

/**
 * Renders the batch toolbar into `root`, replacing its previous content —
 * nothing at all while `selectedElements` is empty, per the acceptance
 * criteria (applying a batch change to an empty selection is a no-op, so
 * there is nothing to apply in the first place; the toolbar simply doesn't
 * offer the action).
 */
function renderBatchToolbar(
  root: HTMLElement,
  options: BatchToolbarOptions,
): void {
  root.replaceChildren();
  if (options.selectedElements.size === 0) return;

  const { elements, spriteGroups, selectedElements } = options;

  const toolbar = document.createElement("div");
  toolbar.className = "elements-editor__batch-toolbar";

  const status = document.createElement("p");
  status.className = "elements-editor__batch-count";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.textContent = describeSelection(elements, selectedElements);
  toolbar.appendChild(status);

  const clearButton = document.createElement("wuik-button");
  clearButton.setAttribute("variant", "secondary");
  clearButton.dataset.action = "clear-selection";
  clearButton.textContent = "Clear selection";
  clearButton.addEventListener("click", options.onClearSelection);
  toolbar.appendChild(clearButton);

  toolbar.appendChild(buildBatchOffsetControl(options.onApplyOffset));
  toolbar.appendChild(
    buildBatchSpriteControl(spriteGroups, options.onApplySprite),
  );

  root.appendChild(toolbar);
}

/** "N selected: name, name, name, +N more" — sorted by current row order, not Set insertion order, so it reads like the list above it. */
function describeSelection(
  elements: BGElement[],
  selectedElements: ReadonlySet<BGElement>,
): string {
  const MAX_NAMES_SHOWN = 5;
  const ordered = elements.filter((el) => selectedElements.has(el));
  const names = ordered.map((el) => el.name || "(unnamed)");
  const shown = names.slice(0, MAX_NAMES_SHOWN);
  const remaining = names.length - shown.length;
  const suffix = remaining > 0 ? `, +${remaining} more` : "";
  return `${ordered.length} selected: ${shown.join(", ")}${suffix}`;
}

function buildBatchOffsetControl(
  onApplyOffset: (deltaX: number, deltaY: number) => void,
): HTMLElement {
  const container = document.createElement("div");
  container.className = "elements-editor__batch-control";

  const deltaXInput = document.createElement("input");
  deltaXInput.type = "number";
  deltaXInput.step = "any";
  deltaXInput.className = "elements-editor__input";
  deltaXInput.dataset.field = "batch-delta-x";
  deltaXInput.value = "0";

  const deltaYInput = document.createElement("input");
  deltaYInput.type = "number";
  deltaYInput.step = "any";
  deltaYInput.className = "elements-editor__input";
  deltaYInput.dataset.field = "batch-delta-y";
  deltaYInput.value = "0";

  const applyButton = document.createElement("wuik-button");
  applyButton.setAttribute("variant", "secondary");
  applyButton.dataset.action = "apply-offset";
  applyButton.textContent = "Apply offset";

  function refreshApplyDisabled(): void {
    const deltaX = Number(deltaXInput.value);
    const deltaY = Number(deltaYInput.value);
    const hasRealValue =
      !Number.isNaN(deltaX) &&
      !Number.isNaN(deltaY) &&
      (deltaX !== 0 || deltaY !== 0);
    applyButton.toggleAttribute("disabled", !hasRealValue);
  }
  deltaXInput.addEventListener("input", refreshApplyDisabled);
  deltaYInput.addEventListener("input", refreshApplyDisabled);
  refreshApplyDisabled();

  applyButton.addEventListener("click", () => {
    onApplyOffset(Number(deltaXInput.value), Number(deltaYInput.value));
  });

  container.append(
    wrapField("Position offset X", deltaXInput),
    wrapField("Position offset Y", deltaYInput),
    applyButton,
  );
  return container;
}

function buildBatchSpriteControl(
  spriteGroups: SpriteGroup[] | null,
  onApplySprite: (sprite: SpriteRef) => void,
): HTMLElement {
  const container = document.createElement("div");
  container.className = "elements-editor__batch-control";

  const select = document.createElement("select");
  select.className = "elements-editor__input";
  select.dataset.field = "batch-sprite";

  const placeholder = document.createElement("option");
  placeholder.value = BATCH_SPRITE_NOT_CHOSEN;
  placeholder.textContent = "Choose a sprite to apply…";
  select.appendChild(placeholder);

  const clearOption = document.createElement("option");
  clearOption.value = UNSET_OPTION_VALUE;
  clearOption.textContent = "— none (clear sprite) —";
  select.appendChild(clearOption);

  for (const group of spriteGroups ?? []) {
    for (const sprite of group.sprites) {
      const option = document.createElement("option");
      const optionValue = `${sprite.group},${sprite.image}`;
      option.value = optionValue;
      option.textContent = `${sprite.group}, ${sprite.image} (${sprite.width}×${sprite.height})`;
      select.appendChild(option);
    }
  }

  const applyButton = document.createElement("wuik-button");
  applyButton.setAttribute("variant", "secondary");
  applyButton.dataset.action = "apply-sprite";
  applyButton.toggleAttribute("disabled", true);

  applyButton.textContent = "Apply sprite";

  select.addEventListener("change", () => {
    applyButton.toggleAttribute(
      "disabled",
      select.value === BATCH_SPRITE_NOT_CHOSEN,
    );
  });

  applyButton.addEventListener("click", () => {
    if (select.value === BATCH_SPRITE_NOT_CHOSEN) return;
    const [group, image] = select.value.split(",").map(Number);
    onApplySprite({ group, image });
  });

  container.append(wrapField("Sprite reference", select), applyButton);
  return container;
}
