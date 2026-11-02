//go:build darwin

package install

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func installLocal(format, filePath, appKey, appName string) (string, error) {
	switch format {
	case "dmg":
		return installDMG(filePath)
	case "zip":
		return installZip(filePath)
	default:
		return "", fmt.Errorf("macOS 暂不支持 %s 格式，请上传 dmg 或 zip", format)
	}
}

func installZip(filePath string) (string, error) {
	tmp, err := os.MkdirTemp("", "vakaohub-unzip-*")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(tmp)

	if output, err := exec.Command("ditto", "-x", "-k", filePath, tmp).CombinedOutput(); err != nil {
		return "", fmt.Errorf("解压失败：%v %s", err, strings.TrimSpace(string(output)))
	}

	appPath, err := findApp(tmp)
	if err != nil {
		return "", err
	}
	return copyToApplications(appPath)
}

func installDMG(filePath string) (string, error) {
	mountPoint, err := os.MkdirTemp("", "vakaohub-dmg-*")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(mountPoint)

	attach := exec.Command(
		"hdiutil", "attach",
		"-nobrowse", "-readonly", "-quiet",
		"-mountpoint", mountPoint,
		filePath,
	)
	if output, err := attach.CombinedOutput(); err != nil {
		return "", fmt.Errorf("挂载 DMG 失败：%v %s", err, strings.TrimSpace(string(output)))
	}
	defer func() {
		_ = exec.Command("hdiutil", "detach", mountPoint, "-force").Run()
	}()

	appPath, err := findApp(mountPoint)
	if err != nil {
		return "", err
	}
	return copyToApplications(appPath)
}

func findApp(root string) (string, error) {
	var found string
	err := filepath.WalkDir(root, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if found != "" {
			return filepath.SkipDir
		}
		if entry.IsDir() && strings.HasSuffix(strings.ToLower(entry.Name()), ".app") {
			found = path
			return filepath.SkipDir
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	if found == "" {
		return "", fmt.Errorf("安装包内未找到 .app")
	}
	return found, nil
}

func copyToApplications(appPath string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	destinationDir := filepath.Join(home, "Applications")
	if err := os.MkdirAll(destinationDir, 0o755); err != nil {
		return "", err
	}

	target := filepath.Join(destinationDir, filepath.Base(appPath))
	if err := os.RemoveAll(target); err != nil {
		return "", err
	}
	if output, err := exec.Command("ditto", appPath, target).CombinedOutput(); err != nil {
		return "", fmt.Errorf("复制应用到 ~/Applications 失败：%v %s", err, strings.TrimSpace(string(output)))
	}

	// 代码签名完整性校验（ad-hoc 签名也会通过；未签名或签名损坏会被拒绝）
	if output, err := exec.Command("codesign", "--verify", "--deep", "--strict", target).CombinedOutput(); err != nil {
		_ = os.RemoveAll(target)
		return "", fmt.Errorf("代码签名校验失败：%v %s", err, strings.TrimSpace(string(output)))
	}
	return target, nil
}

func removeLocal(path string) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	root := filepath.Join(home, "Applications")
	clean := filepath.Clean(path)
	if !strings.HasPrefix(clean, root+string(os.PathSeparator)) {
		return fmt.Errorf("拒绝删除 %s 之外的路径", root)
	}
	return os.RemoveAll(clean)
}

func launchLocal(path string) error {
	output, err := exec.Command("open", path).CombinedOutput()
	if err != nil {
		message := strings.TrimSpace(string(output))
		if strings.Contains(message, "not allowed") || strings.Contains(message, "cannot be opened") {
			return fmt.Errorf("系统阻止了启动（Gatekeeper）：请在 Finder 中右键点击应用选择「打开」，或到 系统设置 → 隐私与安全性 选择「仍要打开」")
		}
		return fmt.Errorf("启动失败：%v %s", err, message)
	}
	return nil
}
