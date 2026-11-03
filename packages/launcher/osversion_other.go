//go:build !darwin

package main

// hostOSVersion 在非 macOS 平台不参与 macOS 最低版本校验。
func hostOSVersion() string {
	return ""
}
