//go:build !darwin && !windows

package install

// Detected 定义在 cache.go。

// CurrentBundle 在非 macOS 平台不可用。
func CurrentBundle() (string, string, bool) {
	return "", "", false
}

// FindApps 在非 macOS 平台不扫描安装目录。
func FindApps(_ string) []Detected {
	return nil
}

// InvalidateIndex 在非 macOS 平台无需失效索引。
func InvalidateIndex() {}
