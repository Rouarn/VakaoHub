//go:build windows

package install

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func installLocal(format, filePath, appKey, appName, targetPath string) (string, error) {
	switch format {
	case "zip":
		return installZip(filePath, appKey)
	case "msi":
		if output, err := exec.Command("msiexec", "/i", filePath, "/qn", "/norestart").CombinedOutput(); err != nil {
			return "", fmt.Errorf("MSI 安装失败：%v %s", err, strings.TrimSpace(string(output)))
		}
		return "", nil
	case "exe":
		cmd := exec.Command("cmd", "/c", "start", "", filePath)
		if err := cmd.Start(); err != nil {
			return "", fmt.Errorf("启动安装程序失败：%v", err)
		}
		return "", nil
	default:
		return "", fmt.Errorf("Windows 暂不支持 %s 格式", format)
	}
}

func installZip(filePath, appKey string) (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	target := filepath.Join(base, "VaKaoHub", "apps", appKey)
	if err := os.RemoveAll(target); err != nil {
		return "", err
	}
	if err := os.MkdirAll(target, 0o755); err != nil {
		return "", err
	}

	reader, err := zip.OpenReader(filePath)
	if err != nil {
		return "", err
	}
	defer reader.Close()

	for _, file := range reader.File {
		name := filepath.Join(target, file.Name)
		if !strings.HasPrefix(name, target+string(os.PathSeparator)) {
			return "", fmt.Errorf("压缩包包含非法路径")
		}
		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(name, 0o755); err != nil {
				return "", err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(name), 0o755); err != nil {
			return "", err
		}
		source, err := file.Open()
		if err != nil {
			return "", err
		}
		destination, err := os.OpenFile(name, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, file.Mode())
		if err != nil {
			source.Close()
			return "", err
		}
		if _, err := io.Copy(destination, source); err != nil {
			source.Close()
			destination.Close()
			return "", err
		}
		source.Close()
		destination.Close()
	}

	var exePath string
	_ = filepath.WalkDir(target, func(path string, entry os.DirEntry, err error) error {
		if err == nil && !entry.IsDir() && strings.HasSuffix(strings.ToLower(entry.Name()), ".exe") && exePath == "" {
			exePath = path
		}
		return nil
	})
	if exePath == "" {
		return target, nil
	}
	return exePath, nil
}

func removeLocal(path string) error {
	base, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	root := filepath.Join(base, "VaKaoHub", "apps")
	clean := filepath.Clean(path)
	if !strings.HasPrefix(clean, root+string(os.PathSeparator)) {
		return fmt.Errorf("拒绝删除 %s 之外的路径；MSI 安装请使用系统卸载", root)
	}
	return os.RemoveAll(clean)
}

func launchLocal(path string) error {
	if output, err := exec.Command("cmd", "/c", "start", "", path).CombinedOutput(); err != nil {
		return fmt.Errorf("启动失败：%v %s", err, strings.TrimSpace(string(output)))
	}
	return nil
}
