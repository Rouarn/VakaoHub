package install

import "errors"

// Install 按产物格式执行平台安装，返回可启动路径（可能为空）。
func Install(format, filePath, appKey, appName, targetPath string) (string, error) {
	return installLocal(format, filePath, appKey, appName, targetPath)
}

// Remove 删除已安装应用（仅允许平台约定的安装目录）。
func Remove(path string) error {
	if path == "" {
		return errors.New("没有记录安装路径，无法自动卸载")
	}
	return removeLocal(path)
}

// Launch 启动已安装应用。
func Launch(path string) error {
	if path == "" {
		return errors.New("该安装方式未记录启动路径，请手动启动")
	}
	return launchLocal(path)
}
