package session

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const stageText = "; my stage\n[Info]\nname = Test Stage\nauthor = Test Author\n\n[BGdef]\nspr = stage.sff\n\n[Camera]\nboundleft = -100\nboundright = 100\nboundhigh = -50\nboundlow = 0\n\n[BG Back]\ntype = normal\nspriteno = 0,0\nlayerno = 0\n\n[BG Front]\ntype = normal\nspriteno = 1,0\nlayerno = 1\n"

func writeFile(t *testing.T, name, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestOpen_ValidStage_ExposesNameAuthorElementsAndCamera(t *testing.T) {
	s, err := Open(writeFile(t, "stage.def", stageText))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if s.Name() != "Test Stage" || s.Author() != "Test Author" {
		t.Errorf("got name %q author %q", s.Name(), s.Author())
	}
	if s.ElementCount() != 2 {
		t.Errorf("got %d BG elements, want 2", s.ElementCount())
	}
	if got := s.CameraSummary(); got != "-100..100, -50..0" {
		t.Errorf("CameraSummary = %q, want %q", got, "-100..100, -50..0")
	}
}

func TestOpen_StageWithoutBGElements_OpensWithZeroElements(t *testing.T) {
	s, err := Open(writeFile(t, "stage.def", "[Info]\nname = Bare\n\n[BGdef]\nspr = stage.sff\n"))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if s.ElementCount() != 0 {
		t.Errorf("got %d BG elements, want 0", s.ElementCount())
	}
}

func TestOpen_CharacterDefinition_RejectedAsNotAStage(t *testing.T) {
	character := "[Info]\nname = Kyo\nauthor = A\n\n[Files]\nsprite = kyo.sff\nanim = kyo.air\ncns = kyo.cns\n"
	_, err := Open(writeFile(t, "kyo.def", character))
	if err == nil || !strings.Contains(err.Error(), "not a stage") {
		t.Fatalf("Open error = %v, want one saying the file is not a stage", err)
	}
}

func TestOpen_EmptyFile_ReturnedAsError(t *testing.T) {
	_, err := Open(writeFile(t, "empty.def", ""))
	if err == nil {
		t.Fatal("Open of an empty file must fail, not yield a blank stage")
	}
}

func TestOpen_MalformedSectionHeader_ReturnsError(t *testing.T) {
	_, err := Open(writeFile(t, "bad.def", "[Info\nname = X\n"))
	if err == nil {
		t.Fatal("Open of a malformed file must fail")
	}
}

func TestOpen_MissingPath_ReturnsErrorNamingTheFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "missing.def")
	_, err := Open(path)
	if err == nil || !strings.Contains(err.Error(), "missing.def") {
		t.Fatalf("Open error = %v, want one naming missing.def", err)
	}
}

func TestSetName_ChangeMarksDirty_RevertClearsDirty(t *testing.T) {
	s, _ := Open(writeFile(t, "stage.def", stageText))
	s.SetName("Renamed")
	if !s.Dirty() {
		t.Error("renaming must mark the stage dirty")
	}
	s.SetName("Test Stage")
	if s.Dirty() {
		t.Error("reverting to the original name must clear dirty")
	}
}

func TestSave_AfterRename_WritesNewNameAndReopens(t *testing.T) {
	path := writeFile(t, "stage.def", stageText)
	s, _ := Open(path)
	s.SetName("Renamed")
	if err := s.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if s.Dirty() {
		t.Error("Save must clear dirty")
	}
	raw, _ := os.ReadFile(path)
	if !strings.Contains(string(raw), "Renamed") || strings.Contains(string(raw), "Test Stage") {
		t.Errorf("saved file does not hold the new name:\n%s", raw)
	}
	again, err := Open(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	if again.Name() != "Renamed" || again.ElementCount() != 2 {
		t.Errorf("reopened name %q with %d elements", again.Name(), again.ElementCount())
	}
}

func TestSave_WithoutChanges_LeavesFileByteIdentical(t *testing.T) {
	crlf := strings.ReplaceAll(stageText, "\n", "\r\n") + "; accent: Ünïcode 日本\r\n"
	path := writeFile(t, "stage.def", crlf)
	s, _ := Open(path)
	if err := s.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}
	raw, _ := os.ReadFile(path)
	if string(raw) != crlf {
		t.Error("an unchanged save must leave the file byte-identical")
	}
}

func TestSave_NonASCIIName_RoundTripsUnchanged(t *testing.T) {
	path := writeFile(t, "stage.def", stageText)
	s, _ := Open(path)
	s.SetName("ステージ 名前")
	if err := s.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}
	again, _ := Open(path)
	if again.Name() != "ステージ 名前" {
		t.Errorf("reopened name %q", again.Name())
	}
}

func TestSave_FailureKeepsEditsAndOriginalFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "stage.def")
	if err := os.WriteFile(path, []byte(stageText), 0o644); err != nil {
		t.Fatal(err)
	}
	s, _ := Open(path)
	s.SetName("Renamed")
	if err := os.Chmod(dir, 0o500); err != nil {
		t.Fatal(err)
	}
	defer os.Chmod(dir, 0o700)
	if os.Geteuid() == 0 {
		t.Skip("permissions are not enforced for root")
	}

	if err := s.Save(); err == nil {
		t.Fatal("Save into a read-only directory must fail")
	}
	if !s.Dirty() || s.Name() != "Renamed" {
		t.Error("a failed save must keep the edits and the dirty state")
	}
	raw, _ := os.ReadFile(path)
	if string(raw) != stageText {
		t.Error("a failed save must leave the original file unchanged")
	}
}

func TestOpen_MusicSection_ExposesMusicFile(t *testing.T) {
	s, err := Open(writeFile(t, "stage.def", stageText+"\n[Music]\nbgmusic = theme.mp3\n"))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if s.MusicFile() != "theme.mp3" {
		t.Errorf("MusicFile = %q, want theme.mp3", s.MusicFile())
	}
}

func TestOpen_NoMusicSection_MusicFileIsEmpty(t *testing.T) {
	s, _ := Open(writeFile(t, "stage.def", stageText))
	if s.MusicFile() != "" {
		t.Errorf("MusicFile = %q, want empty", s.MusicFile())
	}
}
