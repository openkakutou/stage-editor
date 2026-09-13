import path from "node:path";
import { fileURLToPath } from "node:url";
import { waitForVisualReady } from "@openkakutou/web-ui-kit/testing/visual-preset";
import { expect, test } from "@playwright/test";

/**
 * Baseline screenshots of the 3D model editor's real, `three`-rendered live
 * preview (backlog item 011) — the only pixel-level rendering surface this
 * app has (see .vibe/decisions/009). Driven through the app's real New
 * Stage Wizard and the model editor's own file-drop-zone, not a synthetic
 * bypass, against a real, vendored, MIT-licensed `.glb` fixture (see
 * `tests/visual/fixtures/README.md`) reused verbatim from the sibling
 * `stage-viewer-web` repo's own equivalent, already-shipped test.
 */

const FIXTURE_MODEL = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "cvs2london.glb",
);

async function createBlankStageWithModel(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/");
  await page.locator('[data-action="new-stage-blank"]').click();

  // Scoped to the model panel specifically -- the 3D Lighting panel right
  // below it renders its own, separate `wuik-file-drop-zone`, and only the
  // model one is exercised by these tests (no `.hdr` assigned, matching
  // .vibe/decisions/004's own accepted default of an environment-less
  // preview being a valid baseline).
  await page
    .locator(".model-editor__model wuik-file-drop-zone input[type='file']")
    .setInputFiles(FIXTURE_MODEL);
}

test("freshly-assigned model at its default placement matches its baseline", async ({
  page,
}) => {
  await createBlankStageWithModel(page);

  const preview = page.locator(".model-editor__preview");
  await expect(preview).toBeVisible();
  await expect(preview.locator(".model-preview__canvas")).toBeVisible();

  await waitForVisualReady(page);
  await expect(preview).toHaveScreenshot("model-default-placement.png");
});

test("preview after a committed Offset field edit matches its baseline", async ({
  page,
}) => {
  await createBlankStageWithModel(page);

  const preview = page.locator(".model-editor__preview");
  await expect(preview.locator(".model-preview__canvas")).toBeVisible();

  // Offset X, Y, Z and every Scale/Camera Near/Far/fov field all route
  // through the same committed-field -> `updateTransform`/`updateCamera`
  // in-place scene mutation path (.vibe/decisions/004, point 1) -- Offset X
  // alone is enough to prove that contract without three near-duplicate
  // scenarios (.vibe/decisions/009).
  const offsetXField = page.locator("input[data-field='model.offsetX']");
  await offsetXField.fill("3");
  await offsetXField.blur();

  await waitForVisualReady(page);
  await expect(preview).toHaveScreenshot("model-after-offset-edit.png");
});
