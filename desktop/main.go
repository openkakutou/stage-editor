// Command stage-editor-desktop is the native Fyne build of the stage editor.
package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/storage"

	"github.com/openkakutou/stage-editor/desktop/internal/ui"
)

func main() {
	a := app.New()
	win := a.NewWindow(ui.AppTitle)
	var editor *ui.Editor
	editor = ui.New(win, func() {
		d := dialog.NewFileOpen(func(r fyne.URIReadCloser, err error) {
			if err != nil {
				dialog.ShowError(err, win)
				return
			}
			if r == nil {
				return
			}
			r.Close()
			editor.Load(r.URI().Path())
		}, win)
		d.SetFilter(storage.NewExtensionFileFilter([]string{".def"}))
		d.Show()
	})
	win.SetContent(editor.Content())
	win.Resize(fyne.NewSize(560, 320))
	win.ShowAndRun()
}
