//go:build !darwin

package install

import "fmt"

// BundleID 在非 macOS 平台不可用。
func BundleID(_ string) (string, error) {
	return "", fmt.Errorf("当前平台暂不支持读取 Bundle Identifier")
}

// RemoveData 在非 macOS 平台暂不删除用户数据。
func RemoveData(_ string) error {
	return fmt.Errorf("当前平台暂不支持删除应用数据")
}
