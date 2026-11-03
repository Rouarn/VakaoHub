//go:build darwin

package install

import (
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

// Detected 定义在 cache.go。

// installedApp 是扫描到的 .app 元数据，缓存后按名称查找，避免每次刷新都跑 plutil。
type installedApp struct {
	Path    string
	Names   []string
	Version string
}

var appCache scanCache[[]installedApp]

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

// FindApps 在缓存的 .app 索引中按应用名查找。
func FindApps(name string) []Detected {
	target := normalizeName(name)
	found := make([]Detected, 0, 2)

	for _, app := range appCache.get(scanInstalledApps) {
		matched := false
		for _, candidate := range app.Names {
			if normalizeName(candidate) == target {
				matched = true
				break
			}
		}
		if matched {
			found = append(found, Detected{Path: app.Path, Version: app.Version})
		}
	}

	sort.Slice(found, func(i, j int) bool { return found[i].Path < found[j].Path })
	return found
}

// InvalidateIndex 在安装/卸载后调用，下一次 FindApps 重新扫描。
func InvalidateIndex() {
	appCache.reset()
}

func scanInstalledApps() []installedApp {
	roots := make([]string, 0, 2)
	if home, err := os.UserHomeDir(); err == nil {
		roots = append(roots, filepath.Join(home, "Applications"))
	}
	roots = append(roots, "/Applications")

	apps := make([]installedApp, 0, 16)
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
			seen[appPath] = true

			bundleName := plistValue(appPath, "CFBundleDisplayName")
			if bundleName == "" {
				bundleName = plistValue(appPath, "CFBundleName")
			}
			fileName := strings.TrimSuffix(entry.Name(), ".app")
			names := []string{fileName}
			if bundleName != "" {
				names = append(names, bundleName)
			}

			apps = append(apps, installedApp{
				Path:    appPath,
				Names:   names,
				Version: plistValue(appPath, "CFBundleShortVersionString"),
			})
		}
	}
	return apps
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
