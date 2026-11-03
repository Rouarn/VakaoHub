package install

import (
	"regexp"
	"strings"
)

// registryEntry 是 Windows 卸载注册表项里与启动路径相关的字段集合。
type registryEntry struct {
	Key             string
	DisplayName     string
	DisplayVersion  string
	InstallLocation string
	DisplayIcon     string
}

// registryValuePattern 匹配 reg query 的输出行，例如 `    DisplayName    REG_SZ    Foo`。
var registryValuePattern = regexp.MustCompile(`^\s+(.+?)\s{2,}(REG_[A-Z0-9_]+)(?:\s{2,}(.*))?$`)

// parseUninstallRegistry 解析 `reg query <Uninstall 根键> /s` 的输出。
// 未缩进且以 HKEY_ 开头的行是注册表项路径，缩进行是该键下的值。
func parseUninstallRegistry(output string) []registryEntry {
	entries := make([]registryEntry, 0, 8)
	current := -1

	for _, raw := range strings.Split(output, "\n") {
		line := strings.TrimRight(raw, "\r")
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		if line == trimmed {
			current = -1
			if strings.HasPrefix(strings.ToUpper(trimmed), "HKEY_") {
				entries = append(entries, registryEntry{Key: trimmed})
				current = len(entries) - 1
			}
			continue
		}
		if current < 0 {
			continue
		}

		match := registryValuePattern.FindStringSubmatch(line)
		if match == nil {
			continue
		}
		value := strings.TrimSpace(match[3])
		switch strings.ToLower(match[1]) {
		case "displayname":
			entries[current].DisplayName = value
		case "displayversion":
			entries[current].DisplayVersion = value
		case "installlocation":
			entries[current].InstallLocation = value
		case "displayicon":
			entries[current].DisplayIcon = value
		}
	}

	return entries
}

// cleanExecutablePath 去掉引号与 `,0` 形式的图标索引后缀。
func cleanExecutablePath(raw string) string {
	value := strings.TrimSpace(raw)
	if index := strings.Index(value, ","); index >= 0 {
		value = value[:index]
	}
	return strings.Trim(strings.TrimSpace(value), `"`)
}

// isExecutableName 判断路径是否以 .exe 结尾。
func isExecutableName(path string) bool {
	return strings.HasSuffix(strings.ToLower(path), ".exe")
}

// resolveLaunchPath 优先使用 DisplayIcon 指向的 exe，其次在 InstallLocation 中查找；
// 两者都找不到可执行文件时返回空串，调用方据此跳过该注册表项。
func resolveLaunchPath(entry registryEntry, exists func(string) bool, findExe func(string) (string, bool)) string {
	if icon := cleanExecutablePath(entry.DisplayIcon); icon != "" && isExecutableName(icon) && exists(icon) {
		return icon
	}

	location := cleanExecutablePath(entry.InstallLocation)
	if location == "" {
		return ""
	}
	if isExecutableName(location) && exists(location) {
		return location
	}
	if exe, ok := findExe(location); ok {
		return exe
	}
	return ""
}
