//go:build !darwin && !windows

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

func installLocal(format, filePath, appKey, appName string) (string, error) {
	switch format {
	case "zip":
		return installZip(filePath, appKey)
	case "appimage":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		target := filepath.Join(home, "Applications", filepath.Base(filePath))
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return "", err
		}
		if err := copyFile(filePath, target); err != nil {
			return "", err
		}
		if err := os.Chmod(target, 0o755); err != nil {
			return "", err
		}
		return target, nil
	default:
		return "", fmt.Errorf("Linux 暂不支持 %s 格式，请上传 zip 或 appimage", format)
	}
}

func installZip(filePath, appKey string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	target := filepath.Join(home, ".local", "share", "vakaohub", "apps", appKey)
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
	return target, nil
}

func copyFile(source, destination string) error {
	in, err := os.Open(source)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

func removeLocal(path string) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	allowed := []string{
		filepath.Join(home, ".local", "share", "vakaohub"),
		filepath.Join(home, "Applications"),
	}
	clean := filepath.Clean(path)
	for _, root := range allowed {
		if strings.HasPrefix(clean, root+string(os.PathSeparator)) {
			return os.RemoveAll(clean)
		}
	}
	return fmt.Errorf("拒绝删除约定安装目录之外的路径")
}

func launchLocal(path string) error {
	if info, err := os.Stat(path); err == nil && !info.IsDir() {
		cmd := exec.Command(path)
		return cmd.Start()
	}
	if output, err := exec.Command("xdg-open", path).CombinedOutput(); err != nil {
		return fmt.Errorf("启动失败：%v %s", err, strings.TrimSpace(string(output)))
	}
	return nil
}
