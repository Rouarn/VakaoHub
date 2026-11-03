//go:build !darwin

package install

import "fmt"

// Reveal 在非 macOS 平台暂未实现。
func Reveal(_ string) error {
	return fmt.Errorf("当前平台暂不支持在文件管理器中显示")
}
