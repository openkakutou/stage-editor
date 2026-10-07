// Package session holds the editor's open stage, independent of any GUI
// toolkit so it can be tested without a display.
package session

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"regexp"

	"github.com/openkakutou/stage"
)

// bgdefSection marks a stage definition: every stage .def declares it, while
// a character .def does not.
var bgdefSection = regexp.MustCompile(`(?im)^\s*\[bgdef\]\s*$`)

// Session is one stage opened from a .def file.
type Session struct {
	path      string
	original  []byte
	stg       stage.Stage
	savedName string
}

// Open loads the stage defined by the .def file at path. An empty file, a
// file that is not a stage definition, or a malformed one is an error.
func Open(path string) (*Session, error) {
	original, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", filepath.Base(path), err)
	}
	if len(original) == 0 {
		return nil, fmt.Errorf("%s is empty", filepath.Base(path))
	}
	if !bgdefSection.Match(original) {
		return nil, fmt.Errorf("%s is not a stage .def file", filepath.Base(path))
	}
	doc, err := stage.ParseDocument(bytes.NewReader(original))
	if err != nil {
		return nil, fmt.Errorf("parsing %s: %w", filepath.Base(path), err)
	}
	return &Session{
		path:      path,
		original:  original,
		stg:       doc.Stage,
		savedName: doc.Stage.Name,
	}, nil
}

// Path is the file the stage was opened from.
func (s *Session) Path() string { return s.path }

func (s *Session) Name() string   { return s.stg.Name }
func (s *Session) Author() string { return s.stg.Author }

// ElementCount is the number of BG elements (layers) in the stage.
func (s *Session) ElementCount() int { return len(s.stg.Elements) }

// MusicFile is the stage's background music file, or "" when none is set.
func (s *Session) MusicFile() string { return s.stg.MusicFile }

// CameraSummary describes the camera bounds as "left..right, high..low".
func (s *Session) CameraSummary() string {
	b := s.stg.CameraBounds
	return fmt.Sprintf("%d..%d, %d..%d", b.Left, b.Right, b.High, b.Low)
}

// Dirty reports whether the name has changed since the file was last read or
// written.
func (s *Session) Dirty() bool { return s.stg.Name != s.savedName }

func (s *Session) SetName(name string) {
	s.stg.Name = name
}

// Save writes the .def file back, byte-identical when nothing changed. The
// write goes through a temp file so a failure never truncates the original.
func (s *Session) Save() error {
	out, err := stage.SerializeDef(s.original, s.stg)
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(s.path), ".save-*.def")
	if err != nil {
		return fmt.Errorf("saving %s: %w", filepath.Base(s.path), err)
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.Write(out); err != nil {
		tmp.Close()
		return fmt.Errorf("saving %s: %w", filepath.Base(s.path), err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("saving %s: %w", filepath.Base(s.path), err)
	}
	if err := os.Rename(tmp.Name(), s.path); err != nil {
		return fmt.Errorf("saving %s: %w", filepath.Base(s.path), err)
	}
	s.original = out
	s.savedName = s.stg.Name
	return nil
}
