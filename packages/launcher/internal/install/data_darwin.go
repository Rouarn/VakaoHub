//go:build darwin

package install

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// BundleID 读取 .app 的 CFBundleIdentifier。
func BundleID(appPath string) (string, error) {
	value := plistValue(appPath, "CFBundleIdentifier")
	if value == "" {
		return "", fmt.Errorf("无法读取应用的 Bundle Identifier")
	}
	if strings.ContainsAny(value, "/\\") || strings.Contains(value, "..") {
		return "", fmt.Errorf("非法的 Bundle Identifier：%s", value)
	}
	return value, nil
}

// RemoveData 删除与 Bundle Identifier 关联的用户级应用数据。
// 只触碰 ~/Library 下由该 Bundle ID 明确命名的路径。
func RemoveData(bundleID string) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	library := filepath.Join(home, "Library")
	paths := []string{
		filepath.Join(library, "Application Support", bundleID),
		filepath.Join(library, "Caches", bundleID),
		filepath.Join(library, "Preferences", bundleID+".plist"),
		filepath.Join(library, "Saved Application State", bundleID+".savedState"),
		filepath.Join(library, "Containers", bundleID),
		filepath.Join(library, "HTTPStorages", bundleID),
		filepath.Join(library, "WebKit", bundleID),
	}

	for _, path := range paths {
		clean := filepath.Clean(path)
		if !strings.HasPrefix(clean, library+string(os.PathSeparator)) {
			return fmt.Errorf("拒绝删除 Library 之外的路径：%s", path)
		}
		if _, statErr := os.Stat(clean); statErr != nil {
			continue
		}
		if removeErr := os.RemoveAll(clean); removeErr != nil {
			return fmt.Errorf("删除应用数据失败：%s：%w", clean, removeErr)
		}
	}
	return nil
}
