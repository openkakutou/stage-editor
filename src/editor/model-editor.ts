// 3D Model And Stage Settings editor (backlog item 006): assign/remove a
// stage's 3D model and `.hdr` lighting file, edit its placement/scale, the
// 3D camera and perspective-scaling settings, and each player's starting
// depth — with a live 3D preview. See .vibe/decisions/004 for the full
// design reasoning behind every choice below.
//
// Session-only asset state (the model/`.hdr` bytes actually picked, and the
// live preview handle) is kept in a module-level `WeakMap<root, session>`,
// the same "state across repeated calls on the same root, no separate
// stable-id bookkeeping" idiom `model-preview.ts`'s own `stopByRoot` already
// uses — this screen's own DOM is rebuilt on every structural change
// (assign/replace/remove a file), but the live preview's own mounted
// `<wuik-viewport-3d>`/renderer must survive that rebuild untouched, so its
// container element is created once per document and re-parented into the
// freshly built tree rather than recreated (see `remountPreview`/`rerender`
// below). A plain field's own commit (Offset/Scale/Camera Near/Far/fov)
// never rebuilds this screen's DOM at all — it pushes straight into the
// already-mounted preview's own update handle (decision 004, point 1).
//
// Per decision 004: the model/`.hdr` reference must be (re-)selected every
// session to preview/edit it (point 2); removing a file clears only its own
// reference, never the placement/scale fields (point 3); Offset/Scale/
// Environment Intensity are hidden entirely until a model is assigned,
// while Camera/Scaling/PlayerStartZ stay visible regardless (point 3);
// YShift is edited but never applied to the preview (point 6); Scaling and
// PlayerStartZ never trigger a preview update (point 7).
import { readFileAsBytes as defaultReadFileBytes } from "../input/stage-file-input.ts";
import type { BGdef, PlayerStartZ, Scaling, StageData } from "../wasm/types.ts";
import {
  type CameraParams,
  resolveCameraParams,
  resolveModelTransform,
} from "./model-camera.ts";
import {
  type ModelPreviewHandle,
  type ModelPreviewOptions,
  renderModelPreview as defaultRenderModelPreview,
} from "./model-preview.ts";

export interface ModelEditorOptions {
  /** Called after any committed edit — assign/replace/remove a file, or a field change. */
  onChange?: () => void;
  /** Reads a picked File's bytes. Defaults to the shared file-input reader; injectable for testing. */
  readFileBytes?: (file: File) => Promise<Uint8Array>;
  /** Forwarded to `renderModelPreview`'s own loader/renderer options; injectable for testing. */
  previewOptions?: ModelPreviewOptions;
  /** Mounts the live 3D preview. Defaults to the real `renderModelPreview`; injectable for testing so this module's own tests never touch three.js. */
  renderPreview?: (
    root: HTMLElement,
    input: {
      modelBytes: Uint8Array;
      environmentBytes: Uint8Array | null;
    } | null,
    transform: ReturnType<typeof resolveModelTransform>,
    camera: CameraParams,
    options?: ModelPreviewOptions,
  ) => ModelPreviewHandle;
}

interface ModelEditorSession {
  /** Identifies which document this session's asset state belongs to — a different `stage` reference means a new document was loaded onto the same root, and the previous session must be discarded (see `renderModelEditor`). */
  stage: StageData;
  modelBytes: Uint8Array | null;
  environmentBytes: Uint8Array | null;
  previewHandle: ModelPreviewHandle;
  /** Created once per document, re-parented (never recreated) into the rebuilt tree on every structural rerender, so the live preview's own mounted content is never torn down by an unrelated field's edit. */
  previewContainer: HTMLElement;
}

const sessionByRoot = new WeakMap<HTMLElement, ModelEditorSession>();

export function renderModelEditor(
  root: HTMLElement,
  stage: StageData,
  options: ModelEditorOptions = {},
): void {
  const onChange = options.onChange ?? (() => {});
  const readFileBytes = options.readFileBytes ?? defaultReadFileBytes;
  const renderPreview = options.renderPreview ?? defaultRenderModelPreview;

  let session = sessionByRoot.get(root);
  if (!session || session.stage !== stage) {
    // A different (or first) document on this root: tear down any previous
    // document's live preview before starting a fresh session.
    if (session) {
      renderPreview(
        session.previewContainer,
        null,
        resolveModelTransform(stage.model),
        resolveCameraParams(stage.bgDef),
        options.previewOptions,
      );
    }
    const previewContainer = document.createElement("div");
    previewContainer.className = "model-editor__preview";
    session = {
      stage,
      modelBytes: null,
      environmentBytes: null,
      previewHandle: renderPreview(
        previewContainer,
        null,
        resolveModelTransform(stage.model),
        resolveCameraParams(stage.bgDef),
        options.previewOptions,
      ),
      previewContainer,
    };
    sessionByRoot.set(root, session);
  }
  const activeSession = session;

  function rerender(): void {
    renderModelEditor(root, stage, options);
  }

  function remountPreview(): void {
    const input =
      activeSession.modelBytes !== null
        ? {
            modelBytes: activeSession.modelBytes,
            environmentBytes: activeSession.environmentBytes,
          }
        : null;
    activeSession.previewHandle = renderPreview(
      activeSession.previewContainer,
      input,
      resolveModelTransform(stage.model),
      resolveCameraParams(stage.bgDef),
      options.previewOptions,
    );
  }

  root.replaceChildren();
  const container = document.createElement("div");
  container.className = "model-editor";

  container.appendChild(
    buildModelPanel(stage, activeSession, {
      onChange,
      readFileBytes,
      remountPreview,
      rerender,
    }),
  );
  container.appendChild(
    buildEnvironmentPanel(stage, activeSession, {
      onChange,
      readFileBytes,
      remountPreview,
      rerender,
    }),
  );
  container.appendChild(buildCameraPanel(stage.bgDef, activeSession, onChange));
  container.appendChild(buildScalingPanel(stage.scaling, onChange));
  container.appendChild(buildPlayerStartZPanel(stage.playerStartZ, onChange));
  container.appendChild(activeSession.previewContainer);

  root.appendChild(container);
}

interface AssetPanelCallbacks {
  onChange: () => void;
  readFileBytes: (file: File) => Promise<Uint8Array>;
  remountPreview: () => void;
  rerender: () => void;
}

function buildModelPanel(
  stage: StageData,
  session: ModelEditorSession,
  callbacks: AssetPanelCallbacks,
): HTMLElement {
  const panel = document.createElement("wuik-panel");
  panel.className = "model-editor__panel model-editor__model";
  const title = document.createElement("h2");
  title.textContent = "3D Model Placement";
  panel.appendChild(title);

  panel.appendChild(
    buildAssetField({
      kindLabel: "model",
      accept: ".gltf,.glb",
      referencedName: stage.bgDef.modelFile,
      loadedThisSession: session.modelBytes !== null,
      onAssign: async (file) => {
        const bytes = await callbacks.readFileBytes(file);
        stage.bgDef.modelFile = file.name;
        session.modelBytes = bytes;
        callbacks.remountPreview();
        callbacks.onChange();
        callbacks.rerender();
      },
      onRemove: () => {
        stage.bgDef.modelFile = "";
        session.modelBytes = null;
        callbacks.remountPreview();
        callbacks.onChange();
        callbacks.rerender();
      },
    }),
  );

  if (stage.bgDef.modelFile === "") {
    const hint = document.createElement("p");
    hint.className = "model-editor__hint";
    hint.textContent =
      "Assign a model file to edit its placement — any previously tuned values are kept.";
    panel.appendChild(hint);
  }

  if (session.modelBytes !== null) {
    const fields = document.createElement("div");
    fields.className = "model-editor__field-grid";
    for (const { field, label } of MODEL_OFFSET_FIELDS) {
      fields.appendChild(
        buildNumericField(
          `model.${field}`,
          label,
          stage.model[field],
          (value) => {
            stage.model[field] = value;
          },
          callbacks.onChange,
          () =>
            session.previewHandle.updateTransform(
              resolveModelTransform(stage.model),
            ),
        ),
      );
    }
    for (const { field, label } of MODEL_SCALE_FIELDS) {
      fields.appendChild(
        buildNumericField(
          `model.${field}`,
          label,
          stage.model[field],
          (value) => {
            stage.model[field] = value;
          },
          callbacks.onChange,
          () =>
            session.previewHandle.updateTransform(
              resolveModelTransform(stage.model),
            ),
        ),
      );
    }
    fields.appendChild(
      buildNumericField(
        "model.environmentIntensity",
        "Environment Intensity",
        stage.model.environmentIntensity,
        (value) => {
          stage.model.environmentIntensity = value;
        },
        callbacks.onChange,
      ),
    );
    panel.appendChild(fields);
  }

  return panel;
}

function buildEnvironmentPanel(
  stage: StageData,
  session: ModelEditorSession,
  callbacks: AssetPanelCallbacks,
): HTMLElement {
  const panel = document.createElement("wuik-panel");
  panel.className = "model-editor__panel model-editor__environment";
  const title = document.createElement("h2");
  title.textContent = "3D Lighting";
  panel.appendChild(title);

  panel.appendChild(
    buildAssetField({
      kindLabel: "lighting file",
      accept: ".hdr",
      referencedName: stage.model.environment,
      loadedThisSession: session.environmentBytes !== null,
      onAssign: async (file) => {
        const bytes = await callbacks.readFileBytes(file);
        stage.model.environment = file.name;
        session.environmentBytes = bytes;
        callbacks.remountPreview();
        callbacks.onChange();
        callbacks.rerender();
      },
      onRemove: () => {
        stage.model.environment = "";
        session.environmentBytes = null;
        callbacks.remountPreview();
        callbacks.onChange();
        callbacks.rerender();
      },
    }),
  );

  return panel;
}

interface AssetFieldOptions {
  kindLabel: string;
  accept: string;
  referencedName: string;
  loadedThisSession: boolean;
  onAssign: (file: File) => void;
  onRemove: () => void;
}

function buildAssetField(options: AssetFieldOptions): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "model-editor__asset-field";

  if (options.referencedName !== "") {
    const reference = document.createElement("p");
    reference.className = "model-editor__asset-reference";
    reference.textContent = options.loadedThisSession
      ? `Assigned: ${options.referencedName}`
      : `Referenced: ${options.referencedName} — select the file below to preview or edit it.`;
    wrapper.appendChild(reference);
  }

  const dropZone = document.createElement("wuik-file-drop-zone");
  dropZone.setAttribute("accept", options.accept);
  dropZone.className = "model-editor__drop-zone";
  dropZone.addEventListener("wuik-files-selected", (event) => {
    const detail = (event as CustomEvent<{ files: File[] }>).detail;
    const file = detail.files[0];
    if (file) options.onAssign(file);
  });
  wrapper.appendChild(dropZone);

  if (options.referencedName !== "") {
    wrapper.appendChild(
      buildRemoveControl(options.kindLabel, options.onRemove),
    );
  }

  return wrapper;
}

function buildRemoveControl(
  kindLabel: string,
  remove: () => void,
): HTMLElement {
  const container = document.createElement("div");
  container.className = "model-editor__remove-area";

  function renderIdle(): void {
    container.replaceChildren();
    const removeButton = document.createElement("wuik-button");
    removeButton.setAttribute("variant", "secondary");
    removeButton.dataset.action = `remove-${kindLabel.replace(/\s+/g, "-")}`;
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", renderConfirm);
    container.appendChild(removeButton);
  }

  function renderConfirm(): void {
    container.replaceChildren();
    const prompt = document.createElement("span");
    prompt.className = "model-editor__remove-confirm-prompt";
    prompt.textContent = `Remove this ${kindLabel}?`;
    const confirmButton = document.createElement("wuik-button");
    confirmButton.setAttribute("variant", "danger");
    confirmButton.dataset.action = `confirm-remove-${kindLabel.replace(/\s+/g, "-")}`;
    confirmButton.textContent = "Confirm remove";
    confirmButton.addEventListener("click", remove);
    const cancelButton = document.createElement("wuik-button");
    cancelButton.setAttribute("variant", "secondary");
    cancelButton.dataset.action = `cancel-remove-${kindLabel.replace(/\s+/g, "-")}`;
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", renderIdle);
    container.append(prompt, confirmButton, cancelButton);
  }

  renderIdle();
  return container;
}

type ModelOffsetField = "offsetX" | "offsetY" | "offsetZ";
type ModelScaleField = "scaleX" | "scaleY" | "scaleZ";

const MODEL_OFFSET_FIELDS: readonly {
  field: ModelOffsetField;
  label: string;
}[] = [
  { field: "offsetX", label: "Offset X" },
  { field: "offsetY", label: "Offset Y" },
  { field: "offsetZ", label: "Offset Z" },
];

const MODEL_SCALE_FIELDS: readonly { field: ModelScaleField; label: string }[] =
  [
    { field: "scaleX", label: "Scale X" },
    { field: "scaleY", label: "Scale Y" },
    { field: "scaleZ", label: "Scale Z" },
  ];

type CameraField = "near" | "far" | "fov" | "yShift";

const CAMERA_FIELDS: readonly {
  field: CameraField;
  label: string;
  livePreview: boolean;
}[] = [
  { field: "near", label: "Camera Near", livePreview: true },
  { field: "far", label: "Camera Far", livePreview: true },
  { field: "fov", label: "Camera Field Of View", livePreview: true },
  // yShift is edited but never applied to the preview — see .vibe/decisions/004, point 6.
  { field: "yShift", label: "Camera Y Shift", livePreview: false },
];

function buildCameraPanel(
  bgDef: BGdef,
  session: ModelEditorSession,
  onChange: () => void,
): HTMLElement {
  const panel = document.createElement("wuik-panel");
  panel.className = "model-editor__panel model-editor__camera";
  const title = document.createElement("h2");
  title.textContent = "3D Camera";
  panel.appendChild(title);

  const fields = document.createElement("div");
  fields.className = "model-editor__field-grid";
  for (const { field, label, livePreview } of CAMERA_FIELDS) {
    fields.appendChild(
      buildNumericField(
        `bgDef.${field}`,
        label,
        bgDef[field],
        (value) => {
          bgDef[field] = value;
        },
        onChange,
        livePreview
          ? () => session.previewHandle.updateCamera(resolveCameraParams(bgDef))
          : undefined,
      ),
    );
  }
  panel.appendChild(fields);
  return panel;
}

type ScalingField =
  | "depthToScreen"
  | "topZ"
  | "bottomZ"
  | "topScale"
  | "bottomScale";

const SCALING_FIELDS: readonly { field: ScalingField; label: string }[] = [
  { field: "depthToScreen", label: "Depth To Screen" },
  { field: "topZ", label: "Top Z" },
  { field: "bottomZ", label: "Bottom Z" },
  { field: "topScale", label: "Top Scale" },
  { field: "bottomScale", label: "Bottom Scale" },
];

function buildScalingPanel(
  scaling: Scaling,
  onChange: () => void,
): HTMLElement {
  const panel = document.createElement("wuik-panel");
  panel.className = "model-editor__panel model-editor__scaling";
  const title = document.createElement("h2");
  title.textContent = "Perspective Scaling";
  panel.appendChild(title);

  const fields = document.createElement("div");
  fields.className = "model-editor__field-grid";
  // Scaling never has a visual effect in this model-only preview — no
  // player sprites are rendered there — so no field here triggers a
  // preview update (.vibe/decisions/004, point 7).
  for (const { field, label } of SCALING_FIELDS) {
    fields.appendChild(
      buildNumericField(
        `scaling.${field}`,
        label,
        scaling[field],
        (value) => {
          scaling[field] = value;
        },
        onChange,
      ),
    );
  }
  panel.appendChild(fields);
  return panel;
}

type PlayerStartZField = keyof PlayerStartZ;

const PLAYER_START_Z_FIELDS: readonly {
  field: PlayerStartZField;
  label: string;
}[] = [
  { field: "p1", label: "Player 1 Start Z" },
  { field: "p2", label: "Player 2 Start Z" },
  { field: "p3", label: "Player 3 Start Z" },
  { field: "p4", label: "Player 4 Start Z" },
  { field: "p5", label: "Player 5 Start Z" },
  { field: "p6", label: "Player 6 Start Z" },
  { field: "p7", label: "Player 7 Start Z" },
  { field: "p8", label: "Player 8 Start Z" },
];

function buildPlayerStartZPanel(
  playerStartZ: PlayerStartZ,
  onChange: () => void,
): HTMLElement {
  const panel = document.createElement("wuik-panel");
  panel.className = "model-editor__panel model-editor__player-start-z";
  const title = document.createElement("h2");
  title.textContent = "Player Start Depth";
  panel.appendChild(title);

  const fields = document.createElement("div");
  fields.className =
    "model-editor__field-grid model-editor__field-grid--players";
  for (const { field, label } of PLAYER_START_Z_FIELDS) {
    fields.appendChild(
      buildNumericField(
        `playerStartZ.${field}`,
        label,
        playerStartZ[field],
        (value) => {
          playerStartZ[field] = value;
        },
        onChange,
      ),
    );
  }
  panel.appendChild(fields);
  return panel;
}

/**
 * Same commit-on-blur numeric field shape `characteristics-editor.ts`
 * already established: validating on every keystroke would flag a
 * legitimate in-progress value. `onPreviewUpdate`, when given, runs right
 * after a successful commit — the live-preview trigger for the specific
 * fields decision 004 calls out (Offset/Scale/Camera Near/Far/fov), a
 * no-op for every other field here.
 */
function buildNumericField(
  field: string,
  label: string,
  initialValue: number,
  commit: (value: number) => void,
  onChange: () => void,
  onPreviewUpdate?: () => void,
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "model-editor__field";

  const inputId = `model-editor-${field}`;

  const labelEl = document.createElement("label");
  labelEl.className = "model-editor__label";
  labelEl.htmlFor = inputId;
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const input = document.createElement("input");
  input.type = "number";
  input.step = "any";
  input.id = inputId;
  input.className = "model-editor__input";
  input.dataset.field = field;
  input.value = String(initialValue);
  wrapper.appendChild(input);

  const errorEl = document.createElement("span");
  errorEl.className = "model-editor__field-error";
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
    onPreviewUpdate?.();
  });

  return wrapper;
}
