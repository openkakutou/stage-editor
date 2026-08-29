// New Stage Wizard (backlog item 005): an alternative entry point to the
// folder-based file input — lets the user start editing a brand-new stage
// (from scratch, or from a bundled starter template) without loading any
// file. Rendered as its own, visually distinct section (own heading, own
// button treatment) next to the folder input rather than blended into it —
// "load" and "create new" are different verbs, not two options in one list
// (per UI/UX consultation). See
// .vibe/decisions/003-new-stage-defaults-and-unsaved-changes-guard.md.
import type { StageDocument } from "../document/stage-document-store.ts";
import { hasUnsavedStageChanges as defaultHasUnsavedChanges } from "../document/stage-document-store.ts";
import { STAGE_TEMPLATES, createBlankStage } from "./new-stage-defaults.ts";

export interface NewStageWizardOptions {
  /** Called with a freshly-built stage document once creation is confirmed (or nothing was at risk). */
  onCreated: (doc: StageDocument) => void;
  /** Reports whether the currently loaded stage has unsaved edits. Defaults to the real document store; injectable for testing. */
  hasUnsavedChanges?: () => boolean;
  /** Confirms discarding unsaved changes. Defaults to the browser's native `confirm`; injectable for testing. */
  confirmDiscard?: (message: string) => boolean;
}

const DISCARD_CONFIRM_MESSAGE =
  "You have unsaved changes to the current stage. Starting a new stage will discard them. Continue?";

function blankDocument(): StageDocument {
  return {
    fileName: "stage.def",
    relativePath: "stage.def",
    stage: createBlankStage(),
    // No original file yet — `saveStage` documents an empty buffer as the
    // correct input for a brand new stage with nothing to round-trip from.
    defBytes: new Uint8Array(),
    sffFileName: "",
    sffRelativePath: "",
    sffBytes: new Uint8Array(),
  };
}

function templateDocument(templateId: string): StageDocument {
  const template = STAGE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error(`unknown stage template: ${templateId}`);
  return {
    fileName: "stage.def",
    relativePath: "stage.def",
    stage: template.build(),
    defBytes: new Uint8Array(),
    sffFileName: "",
    sffRelativePath: "",
    sffBytes: new Uint8Array(),
  };
}

/**
 * Renders the New Stage Wizard into `root`, replacing its previous content.
 */
export function renderNewStageWizard(
  root: HTMLElement,
  options: NewStageWizardOptions,
): void {
  root.replaceChildren();

  const hasUnsavedChanges =
    options.hasUnsavedChanges ?? defaultHasUnsavedChanges;
  const confirmDiscard =
    options.confirmDiscard ?? ((message: string) => window.confirm(message));

  function createIfConfirmed(build: () => StageDocument): void {
    if (hasUnsavedChanges() && !confirmDiscard(DISCARD_CONFIRM_MESSAGE)) {
      return;
    }
    options.onCreated(build());
  }

  const panel = document.createElement("wuik-panel");
  panel.className = "new-stage-wizard";

  const heading = document.createElement("h2");
  heading.textContent = "Start a New Stage";
  panel.appendChild(heading);

  const actions = document.createElement("div");
  actions.className = "new-stage-wizard__actions";

  const blankButton = document.createElement("wuik-button");
  blankButton.dataset.action = "new-stage-blank";
  blankButton.textContent = "Blank Stage";
  blankButton.addEventListener("click", () => {
    createIfConfirmed(blankDocument);
  });
  actions.appendChild(blankButton);

  for (const template of STAGE_TEMPLATES) {
    const templateButton = document.createElement("wuik-button");
    templateButton.setAttribute("variant", "secondary");
    templateButton.dataset.action = "new-stage-template";
    templateButton.dataset.templateId = template.id;
    templateButton.textContent = template.label;
    templateButton.addEventListener("click", () => {
      createIfConfirmed(() => templateDocument(template.id));
    });
    actions.appendChild(templateButton);
  }

  panel.appendChild(actions);
  root.appendChild(panel);
}
