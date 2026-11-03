//go:build !darwin

package install

// Detected 是一个在标准安装目录中发现的 .app。
type Detected struct {
	Path    string
	Version string
}

// CurrentBundle 在非 macOS 平台不可用。
func CurrentBundle() (string, string, bool) {
	return "", "", false
}

// FindApps 在非 macOS 平台不扫描安装目录。
func FindApps(_ string) []Detected {
	return nil
}
