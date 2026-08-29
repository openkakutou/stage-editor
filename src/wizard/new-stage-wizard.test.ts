import { describe, expect, it, vi } from "vitest";
import type { StageDocument } from "../document/stage-document-store.ts";
import { renderNewStageWizard } from "./new-stage-wizard.ts";

function blankButton(root: HTMLElement): HTMLElement {
  const button = root.querySelector<HTMLElement>(
    '[data-action="new-stage-blank"]',
  );
  if (!button) throw new Error("blank stage button not found");
  return button;
}

function templateButton(root: HTMLElement): HTMLElement {
  const button = root.querySelector<HTMLElement>(
    '[data-action="new-stage-template"]',
  );
  if (!button) throw new Error("template button not found");
  return button;
}

describe("renderNewStageWizard", () => {
  it("renders a Blank Stage button and at least one named template button", () => {
    const root = document.createElement("div");

    renderNewStageWizard(root, { onCreated: vi.fn() });

    expect(blankButton(root)).not.toBeNull();
    const template = templateButton(root);
    expect(template.textContent?.length).toBeGreaterThan(0);
  });

  it("is visually distinct from a folder-load control — its own section heading", () => {
    const root = document.createElement("div");

    renderNewStageWizard(root, { onCreated: vi.fn() });

    expect(root.textContent).toMatch(/new stage/i);
  });

  it("creates a blank stage immediately when nothing is loaded, with no confirm prompt", () => {
    const root = document.createElement("div");
    const onCreated = vi.fn();
    const confirmDiscard = vi.fn();

    renderNewStageWizard(root, {
      onCreated,
      hasUnsavedChanges: () => false,
      confirmDiscard,
    });
    blankButton(root).click();

    expect(confirmDiscard).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledOnce();
    const created = onCreated.mock.calls[0]?.[0] as StageDocument;
    expect(created.stage.elements).toEqual([]);
    expect(created.defBytes).toEqual(new Uint8Array());
  });

  it("creates the template's stage when its button is clicked, with no confirm prompt when nothing is dirty", () => {
    const root = document.createElement("div");
    const onCreated = vi.fn();

    renderNewStageWizard(root, {
      onCreated,
      hasUnsavedChanges: () => false,
      confirmDiscard: vi.fn(),
    });
    templateButton(root).click();

    expect(onCreated).toHaveBeenCalledOnce();
    const created = onCreated.mock.calls[0]?.[0] as StageDocument;
    expect(created.stage.elements?.length).toBeGreaterThan(0);
  });

  it("asks for confirmation, naming the consequence, before discarding unsaved changes", () => {
    const root = document.createElement("div");
    const onCreated = vi.fn();
    const confirmDiscard = vi.fn().mockReturnValue(true);

    renderNewStageWizard(root, {
      onCreated,
      hasUnsavedChanges: () => true,
      confirmDiscard,
    });
    blankButton(root).click();

    expect(confirmDiscard).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it("never creates a new stage, and leaves nothing changed, when the user declines to discard", () => {
    const root = document.createElement("div");
    const onCreated = vi.fn();

    renderNewStageWizard(root, {
      onCreated,
      hasUnsavedChanges: () => true,
      confirmDiscard: () => false,
    });
    blankButton(root).click();
    templateButton(root).click();

    expect(onCreated).not.toHaveBeenCalled();
  });
});
