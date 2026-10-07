// Package ui is the Fyne front end of the desktop editor.
package ui

import (
	"fmt"
	"path/filepath"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"

	"github.com/openkakutou/stage-editor/desktop/internal/session"
)

const AppTitle = "Stage Editor"

// Editor is the main window content: open a stage, rename it, save.
type Editor struct {
	win        fyne.Window
	sess       *session.Session
	nameEntry  *widget.Entry
	author     *widget.Label
	contents   *widget.Label
	status     *widget.Label
	saveButton *widget.Button
	content    fyne.CanvasObject
}

// New builds the editor. onOpen is called when the user presses "Open…" or
// Ctrl+O; the caller shows a file picker and then calls Load.
func New(win fyne.Window, onOpen func()) *Editor {
	e := &Editor{
		win:       win,
		nameEntry: widget.NewEntry(),
		author:    widget.NewLabel("-"),
		contents:  widget.NewLabel("-"),
		status:    widget.NewLabel("Open a stage's .def file to start."),
	}
	e.nameEntry.Disable()
	e.nameEntry.OnChanged = e.onNameChanged
	e.saveButton = widget.NewButton("Save", e.save)
	e.saveButton.Disable()

	form := widget.NewForm(
		widget.NewFormItem("Stage name", e.nameEntry),
		widget.NewFormItem("Author", e.author),
		widget.NewFormItem("Contents", e.contents),
	)
	toolbar := container.NewHBox(widget.NewButton("Open…", onOpen), e.saveButton)
	e.content = container.NewBorder(toolbar, e.status, nil, nil, form)

	win.Canvas().AddShortcut(&desktop.CustomShortcut{KeyName: fyne.KeyO, Modifier: fyne.KeyModifierShortcutDefault},
		func(fyne.Shortcut) { onOpen() })
	win.Canvas().AddShortcut(&desktop.CustomShortcut{KeyName: fyne.KeyS, Modifier: fyne.KeyModifierShortcutDefault},
		func(fyne.Shortcut) { e.save() })
	return e
}

// Content is the widget tree to set on the window.
func (e *Editor) Content() fyne.CanvasObject { return e.content }

// Load opens the stage at path. A failure is reported in the status line and
// leaves the currently open stage, its edits and its Save state untouched.
func (e *Editor) Load(path string) {
	s, err := session.Open(path)
	if err != nil {
		e.status.SetText("Cannot open stage: " + err.Error())
		return
	}
	e.sess = s
	e.nameEntry.Enable()
	e.nameEntry.SetText(s.Name())
	e.author.SetText(orDash(s.Author()))
	e.contents.SetText(summary(s))
	e.status.SetText("Opened " + filepath.Base(path))
	e.refresh()
}

func (e *Editor) onNameChanged(name string) {
	if e.sess == nil {
		return
	}
	e.sess.SetName(name)
	if e.sess.Dirty() {
		e.status.SetText("Unsaved changes")
	}
	e.refresh()
}

func (e *Editor) save() {
	if e.sess == nil {
		return
	}
	if err := e.sess.Save(); err != nil {
		e.status.SetText("Save failed: " + err.Error() + ". Your edits are still here.")
		e.refresh()
		return
	}
	e.status.SetText("Saved " + filepath.Base(e.sess.Path()))
	e.refresh()
}

// refresh syncs the Save button and the window title with the unsaved state.
func (e *Editor) refresh() {
	if e.sess == nil {
		e.saveButton.Disable()
		e.win.SetTitle(AppTitle)
		return
	}
	if e.sess.Dirty() {
		e.saveButton.Enable()
		e.win.SetTitle(fmt.Sprintf("%s - %s *", AppTitle, filepath.Base(e.sess.Path())))
		return
	}
	e.saveButton.Disable()
	e.win.SetTitle(fmt.Sprintf("%s - %s", AppTitle, filepath.Base(e.sess.Path())))
}

func summary(s *session.Session) string {
	return fmt.Sprintf("%d BG elements\nCamera bounds: %s\nMusic: %s",
		s.ElementCount(), s.CameraSummary(), orDash(s.MusicFile()))
}

func orDash(text string) string {
	if text == "" {
		return "-"
	}
	return text
}
