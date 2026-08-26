// Characteristics editor (backlog item 003): a form for a loaded stage's
// top-level metadata — name, author, camera bounds, stage boundaries. The
// first of this item's two editing screens (the other being the BG element
// editor, elements-editor.ts).
//
// Edits mutate the given `StageData` object in place — the same object
// reference the document store holds — rather than returning a patch, the
// same shape `lifebar-editor`'s own `elements-editor.ts` established for
// the identical "caller-owned document, no re-parse round trip" reason. An
// optional `onChange` observer exists only for callers/tests that want to
// react to a committed edit, not for persistence itself.
//
// Text fields commit live (on `input`), matching `character-editor`'s own
// characteristics-editor.ts precedent for free text. Numeric fields commit
// on `blur` instead: validating on every keystroke would flag a legitimate
// in-progress value (e.g. typing "-180" reads as invalid at the
// intermediate "-") — matches the commit-on-blur convention
// `lifebar-editor`'s own elements-editor.ts already uses for its text
// fields, applied here to numbers for the equivalent reason.
//
// Camera Bounds and Stage Boundaries share the same left/right-shaped
// field structure but are distinct concepts (see
// .vibe/glossary.md) — each gets its own visually separate panel, and
// every field's own label repeats its section ("Camera Left", never a bare
// "Left") so the two can't be conflated when scanned or tabbed through.
import type { StageData } from "../wasm/types.ts";

export interface CharacteristicsEditorOptions {
  /** Called after any field's edit is committed into `stage`. */
  onChange?: () => void;
}

type TextField = "name" | "author";

const TEXT_FIELDS: readonly { field: TextField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "author", label: "Author" },
];

type CameraField = "left" | "right" | "high" | "low";
type BoundaryField = "left" | "right" | "topBound" | "bottomBound";

const CAMERA_FIELDS: readonly { field: CameraField; label: string }[] = [
  { field: "left", label: "Camera Left" },
  { field: "right", label: "Camera Right" },
  { field: "high", label: "Camera High" },
  { field: "low", label: "Camera Low" },
];

const BOUNDARY_FIELDS: readonly { field: BoundaryField; label: string }[] = [
  { field: "left", label: "Boundary Left" },
  { field: "right", label: "Boundary Right" },
  { field: "topBound", label: "Boundary Top" },
  { field: "bottomBound", label: "Boundary Bottom" },
];

/**
 * Renders the characteristics editor into `root`, replacing its previous
 * content, pre-filled from `stage`.
 */
export function renderCharacteristicsEditor(
  root: HTMLElement,
  stage: StageData,
  options: CharacteristicsEditorOptions = {},
): void {
  root.replaceChildren();
  const onChange = options.onChange ?? (() => {});

  const container = document.createElement("div");
  container.className = "characteristics-editor";

  const identity = document.createElement("wuik-panel");
  identity.className =
    "characteristics-editor__panel characteristics-editor__identity";
  const identityTitle = document.createElement("h2");
  identityTitle.textContent = "Identity";
  identity.appendChild(identityTitle);
  for (const { field, label } of TEXT_FIELDS) {
    identity.appendChild(buildTextField(field, label, stage, onChange));
  }

  const camera = document.createElement("wuik-panel");
  camera.className =
    "characteristics-editor__panel characteristics-editor__camera-bounds";
  const cameraTitle = document.createElement("h2");
  cameraTitle.textContent = "Camera Bounds";
  camera.appendChild(cameraTitle);
  for (const { field, label } of CAMERA_FIELDS) {
    camera.appendChild(
      buildNumericField(
        `cameraBounds.${field}`,
        label,
        stage.cameraBounds[field],
        (value) => {
          stage.cameraBounds[field] = value;
        },
        onChange,
      ),
    );
  }

  const boundaries = document.createElement("wuik-panel");
  boundaries.className =
    "characteristics-editor__panel characteristics-editor__stage-boundaries";
  const boundariesTitle = document.createElement("h2");
  boundariesTitle.textContent = "Stage Boundaries";
  boundaries.appendChild(boundariesTitle);
  for (const { field, label } of BOUNDARY_FIELDS) {
    boundaries.appendChild(
      buildNumericField(
        `stageBoundaries.${field}`,
        label,
        stage.stageBoundaries[field],
        (value) => {
          stage.stageBoundaries[field] = value;
        },
        onChange,
      ),
    );
  }

  container.append(identity, camera, boundaries);
  root.appendChild(container);
}

function buildTextField(
  field: TextField,
  label: string,
  stage: StageData,
  onChange: () => void,
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "characteristics-editor__field";

  const inputId = `characteristics-editor-${field}`;

  const labelEl = document.createElement("label");
  labelEl.className = "characteristics-editor__label";
  labelEl.htmlFor = inputId;
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const input = document.createElement("input");
  input.type = "text";
  input.id = inputId;
  input.className = "characteristics-editor__input";
  input.dataset.field = field;
  input.value = stage[field];
  wrapper.appendChild(input);

  input.addEventListener("input", () => {
    stage[field] = input.value;
    onChange();
  });

  return wrapper;
}

function buildNumericField(
  field: string,
  label: string,
  initialValue: number,
  commit: (value: number) => void,
  onChange: () => void,
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "characteristics-editor__field";

  const inputId = `characteristics-editor-${field}`;

  const labelEl = document.createElement("label");
  labelEl.className = "characteristics-editor__label";
  labelEl.htmlFor = inputId;
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const input = document.createElement("input");
  input.type = "number";
  input.step = "any";
  input.id = inputId;
  input.className = "characteristics-editor__input";
  input.dataset.field = field;
  input.value = String(initialValue);
  wrapper.appendChild(input);

  const errorEl = document.createElement("span");
  errorEl.className = "characteristics-editor__field-error";
  errorEl.hidden = true;
  wrapper.appendChild(errorEl);

  function setInvalid(message: string | null): void {
    if (message === null) {
      input.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  input.addEventListener("blur", () => {
    const value = Number(input.value);
    if (input.value.trim() === "" || Number.isNaN(value)) {
      setInvalid(`${label} must be a number.`);
      return;
    }
    setInvalid(null);
    commit(value);
    onChange();
  });

  return wrapper;
}
