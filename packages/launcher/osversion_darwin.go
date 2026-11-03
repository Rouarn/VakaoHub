//go:build darwin

package main

import (
	"os/exec"
	"strings"
)

// hostOSVersion 返回当前运行设备的 macOS 版本，如 14.5。
func hostOSVersion() string {
	output, err := exec.Command("sw_vers", "-productVersion").Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(output))
}
