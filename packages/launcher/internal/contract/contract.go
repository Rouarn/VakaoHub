// Package contract 收敛与服务端共享契约一致的平台、架构与产物格式常量。
// 修改时需同步 packages/shared/src/index.ts。
package contract

const (
	PlatformAndroid = "android"
	PlatformDarwin  = "darwin"
	PlatformWindows = "win32"
	PlatformLinux   = "linux"

	ArchUniversal = "universal"
	ArchARM64     = "arm64"
	ArchX64       = "x64"

	FormatAPK      = "apk"
	FormatDMG      = "dmg"
	FormatMSI      = "msi"
	FormatEXE      = "exe"
	FormatZIP      = "zip"
	FormatAppImage = "appimage"
	FormatDEB      = "deb"
)

// PreferredFormats 每个平台的首选产物格式，顺序即优先级。
var PreferredFormats = map[string][]string{
	PlatformAndroid: {FormatAPK, FormatZIP},
	PlatformDarwin:  {FormatDMG, FormatZIP},
	PlatformWindows: {FormatMSI, FormatEXE, FormatZIP},
	PlatformLinux:   {FormatAppImage, FormatDEB, FormatZIP},
}
