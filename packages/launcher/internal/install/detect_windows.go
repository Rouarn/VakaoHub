//go:build windows

package install

import (
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"vakaohub/launcher/internal/version"
)

// Detected 定义在 cache.go。

// CurrentBundle 返回启动器可执行文件路径与构建注入的版本；
// 开发构建未注入版本时返回 false，避免空版本参与更新判断。
func CurrentBundle() (string, string, bool) {
	if version.Version == "" {
		return "", "", false
	}
	executable, err := os.Executable()
	if err != nil {
		return "", "", false
	}
	return executable, version.Version, true
}

var uninstallCache scanCache[[]registryEntry]

// FindApps 从缓存的卸载注册表索引中按显示名匹配已安装程序。
func FindApps(name string) []Detected {
	target := normalizeName(name)
	entries := uninstallCache.get(queryUninstallRegistry)
	found := make([]Detected, 0, 2)

	for _, entry := range entries {
		if normalizeName(entry.DisplayName) != target {
			continue
		}
		path := resolveLaunchPath(entry, fileExists, findFirstExecutable)
		if path == "" {
			continue
		}
		found = append(found, Detected{Path: path, Version: entry.DisplayVersion})
	}

	sort.Slice(found, func(i, j int) bool { return found[i].Path < found[j].Path })
	return found
}

// InvalidateIndex 在安装/卸载后调用，下一次 FindApps 重新读取注册表。
func InvalidateIndex() {
	uninstallCache.reset()
}

var uninstallRegistryRoots = []string{
	`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`,
	`HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`,
	`HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`,
}

func queryUninstallRegistry() []registryEntry {
	entries := make([]registryEntry, 0, 16)
	for _, root := range uninstallRegistryRoots {
		// 管道输出沿用控制台代码页，先切到 UTF-8，避免中文显示名乱码。
		output, err := exec.Command("cmd", "/c", "chcp 65001 >nul && reg query "+root+" /s").CombinedOutput()
		if err != nil {
			continue
		}
		entries = append(entries, parseUninstallRegistry(string(output))...)
	}
	return entries
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

// findFirstExecutable 在安装目录最多两层内查找第一个 exe，避免遍历整棵程序目录。
func findFirstExecutable(dir string) (string, bool) {
	root := filepath.Clean(dir)
	info, err := os.Stat(root)
	if err != nil || !info.IsDir() {
		return "", false
	}

	found := ""
	_ = filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil || found != "" {
			return nil
		}
		if entry.IsDir() {
			relative := strings.TrimPrefix(path, root)
			if path != root && strings.Count(relative, string(os.PathSeparator)) >= 2 {
				return fs.SkipDir
			}
			return nil
		}
		if isExecutableName(path) {
			found = path
		}
		return nil
	})
	return found, found != ""
}

func normalizeName(value string) string {
	replacer := strings.NewReplacer(" ", "", "-", "", "_", "", ".", "")
	return strings.ToLower(replacer.Replace(value))
}
