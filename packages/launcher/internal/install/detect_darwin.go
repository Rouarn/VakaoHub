//go:build darwin

package install

import (
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

// Detected 是一个在标准安装目录中发现的 .app。
type Detected struct {
	Path    string
	Version string
}

// CurrentBundle 返回当前进程所在 .app 的路径与版本。
func CurrentBundle() (string, string, bool) {
	executable, err := os.Executable()
	if err != nil {
		return "", "", false
	}
	executable, err = filepath.EvalSymlinks(executable)
	if err != nil {
		return "", "", false
	}

	index := strings.Index(executable, ".app/Contents/MacOS/")
	if index < 0 {
		return "", "", false
	}
	appPath := executable[:index+len(".app")]
	return appPath, plistValue(appPath, "CFBundleShortVersionString"), true
}

// FindApps 在 ~/Applications 与 /Applications 中按应用名查找 .app。
func FindApps(name string) []Detected {
	roots := make([]string, 0, 2)
	if home, err := os.UserHomeDir(); err == nil {
		roots = append(roots, filepath.Join(home, "Applications"))
	}
	roots = append(roots, "/Applications")

	target := normalizeName(name)
	found := make([]Detected, 0, 2)
	seen := make(map[string]bool)

	for _, root := range roots {
		entries, err := os.ReadDir(root)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if !entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".app") {
				continue
			}
			appPath := filepath.Join(root, entry.Name())
			if seen[appPath] {
				continue
			}

			bundleName := plistValue(appPath, "CFBundleDisplayName")
			if bundleName == "" {
				bundleName = plistValue(appPath, "CFBundleName")
			}
			if bundleName == "" {
				bundleName = strings.TrimSuffix(entry.Name(), ".app")
			}

			fileName := strings.TrimSuffix(entry.Name(), ".app")
			if normalizeName(bundleName) != target && normalizeName(fileName) != target {
				continue
			}

			seen[appPath] = true
			found = append(found, Detected{
				Path:    appPath,
				Version: plistValue(appPath, "CFBundleShortVersionString"),
			})
		}
	}

	sort.Slice(found, func(i, j int) bool { return found[i].Path < found[j].Path })
	return found
}

func normalizeName(value string) string {
	replacer := strings.NewReplacer(" ", "", "-", "", "_", "", ".", "")
	return strings.ToLower(replacer.Replace(value))
}

func plistValue(appPath, key string) string {
	info := filepath.Join(appPath, "Contents", "Info.plist")
	output, err := exec.Command("plutil", "-extract", key, "raw", "-o", "-", info).Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(output))
}
