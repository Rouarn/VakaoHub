//go:build darwin

package install

import "os/exec"

// Reveal 在访达中选中指定应用。
func Reveal(path string) error {
	return exec.Command("open", "-R", path).Run()
}
