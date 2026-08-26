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
import type { Sprite, SpriteGroup } from "../wasm/sff-types.ts";
import type {
  BGElement,
  BGElementType,
  SpriteRef,
  StageData,
} from "../wasm/types.ts";

export interface ElementsEditorOptions {
  /**
   * Which rows are expanded, by index into `stage.elements`. The caller
   * should pass the same Set instance across re-renders so the user's
   * place is preserved. A fresh Set is used if omitted (everything starts
   * collapsed).
   */
  expandedRows?: Set<number>;
  /** Called after any committed edit — add, remove, or a field change. */
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
      onChange,
    });
  }

  const heading = document.createElement("h2");
  heading.textContent = `BG Elements (${elements().length})`;
  panel.appendChild(heading);

  const list = document.createElement("div");
  list.className = "elements-editor__list";
  elements().forEach((el, index) => {
    const remove = () => {
      elements().splice(index, 1);
      expandedRows.delete(index);
      onChange();
      rerender();
    };
    list.appendChild(
      buildRow(
        el,
        index,
        expandedRows,
        spriteGroups,
        rerender,
        onChange,
        remove,
      ),
    );
  });
  panel.appendChild(list);

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

function buildRow(
  el: BGElement,
  index: number,
  expandedRows: Set<number>,
  spriteGroups: SpriteGroup[] | null,
  rerender: () => void,
  onChange: () => void,
  remove: () => void,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "elements-editor__row";

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

  row.append(toggle, body);

  const removeArea = document.createElement("div");
  removeArea.className = "elements-editor__remove-area";
  buildRemoveControl(removeArea, el, remove);
  row.appendChild(removeArea);

  return row;
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
