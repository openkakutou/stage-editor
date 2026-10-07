package ui

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/test"
)

const stageText = "[Info]\nname = Test Stage\nauthor = Test Author\n\n[Music]\nbgmusic = theme.mp3\n\n[BGdef]\nspr = stage.sff\n\n[Camera]\nboundleft = -100\nboundright = 100\nboundhigh = -50\nboundlow = 0\n\n[BG Back]\ntype = normal\nspriteno = 0,0\nlayerno = 0\n\n[BG Front]\ntype = normal\nspriteno = 1,0\nlayerno = 1\n"

const characterText = "[Info]\nname = Kyo\nauthor = A\n\n[Files]\nsprite = kyo.sff\nanim = kyo.air\ncns = kyo.cns\n"

func writeDef(t *testing.T, name, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func newEditor(t *testing.T) (*Editor, fyne.Window) {
	t.Helper()
	win := test.NewApp().NewWindow("t")
	return New(win, func() {}), win
}

func TestEditor_InitialState_SaveDisabledAndOpenHintShown(t *testing.T) {
	e, _ := newEditor(t)
	if !e.saveButton.Disabled() {
		t.Error("save must be disabled before a stage is open")
	}
	if !strings.Contains(e.status.Text, "stage") {
		t.Errorf("expected a hint telling the user to open a stage .def, got %q", e.status.Text)
	}
}

func TestEditor_LoadStage_FillsFieldsAndSummary(t *testing.T) {
	e, _ := newEditor(t)
	e.Load(writeDef(t, "stage.def", stageText))
	if e.nameEntry.Text != "Test Stage" || e.author.Text != "Test Author" {
		t.Errorf("name %q author %q", e.nameEntry.Text, e.author.Text)
	}
	for _, want := range []string{"2 BG elements", "-100..100, -50..0", "theme.mp3"} {
		if !strings.Contains(e.contents.Text, want) {
			t.Errorf("contents %q should mention %q", e.contents.Text, want)
		}
	}
	if !e.saveButton.Disabled() {
		t.Error("save must be disabled right after opening, with no edits")
	}
}

func TestEditor_LoadInvalidFile_ShowsErrorNamingFile(t *testing.T) {
	e, _ := newEditor(t)
	e.Load(filepath.Join(t.TempDir(), "missing.def"))
	if !strings.Contains(e.status.Text, "missing.def") {
		t.Errorf("status should name the failing file, got %q", e.status.Text)
	}
	if !e.saveButton.Disabled() {
		t.Error("save must stay disabled after a failed open")
	}
}

func TestEditor_LoadCharacterFile_RejectedAndPreviousStageKept(t *testing.T) {
	e, _ := newEditor(t)
	e.Load(writeDef(t, "stage.def", stageText))
	e.nameEntry.SetText("Edited")

	e.Load(writeDef(t, "kyo.def", characterText))

	if !strings.Contains(e.status.Text, "not a stage") {
		t.Errorf("status should say the file is not a stage, got %q", e.status.Text)
	}
	if e.nameEntry.Text != "Edited" {
		t.Errorf("a failed open must keep the edited name, got %q", e.nameEntry.Text)
	}
	if e.saveButton.Disabled() {
		t.Error("a failed open must keep Save enabled for the unsaved edit")
	}
}

func TestEditor_EditName_EnablesSaveAndMarksTitle_RevertClearsBoth(t *testing.T) {
	e, win := newEditor(t)
	e.Load(writeDef(t, "stage.def", stageText))
	cleanTitle := win.Title()

	e.nameEntry.SetText("Renamed")
	if e.saveButton.Disabled() {
		t.Error("an edit must enable Save")
	}
	if !strings.HasSuffix(win.Title(), "*") {
		t.Errorf("title %q should carry the unsaved marker", win.Title())
	}

	e.nameEntry.SetText("Test Stage")
	if !e.saveButton.Disabled() {
		t.Error("reverting the name must disable Save again")
	}
	if win.Title() != cleanTitle {
		t.Errorf("title %q should be back to %q", win.Title(), cleanTitle)
	}
}

func TestEditor_Save_WritesFileAndReportsSaved(t *testing.T) {
	path := writeDef(t, "stage.def", stageText)
	e, _ := newEditor(t)
	e.Load(path)
	e.nameEntry.SetText("Renamed")

	e.save()

	if !strings.Contains(e.status.Text, "Saved") {
		t.Errorf("status should confirm the save, got %q", e.status.Text)
	}
	if !e.saveButton.Disabled() {
		t.Error("save must be disabled once the edit is written")
	}
	raw, _ := os.ReadFile(path)
	if !strings.Contains(string(raw), "Renamed") {
		t.Error("the file on disk should hold the new name")
	}
}

func TestEditor_SaveFailure_KeepsEditsAndSaveEnabled(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "stage.def")
	if err := os.WriteFile(path, []byte(stageText), 0o644); err != nil {
		t.Fatal(err)
	}
	e, _ := newEditor(t)
	e.Load(path)
	e.nameEntry.SetText("Renamed")
	if err := os.Chmod(dir, 0o500); err != nil {
		t.Fatal(err)
	}
	defer os.Chmod(dir, 0o700)
	if os.Geteuid() == 0 {
		t.Skip("permissions are not enforced for root")
	}
	if runtime.GOOS == "windows" {
		t.Skip("read-only directories are not enforced on Windows")
	}

	e.save()

	if !strings.Contains(e.status.Text, "Save failed") || !strings.Contains(e.status.Text, "stage.def") {
		t.Errorf("status should report the failed save naming the file, got %q", e.status.Text)
	}
	if e.saveButton.Disabled() {
		t.Error("a failed save must keep Save enabled")
	}
	if e.nameEntry.Text != "Renamed" {
		t.Error("a failed save must keep the edited name")
	}
}
