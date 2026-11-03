package install

import "testing"

// 一份典型的 `reg query HKLM\...\Uninstall /s` 输出片段。
const uninstallFixture = `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{1F2E3D4C-0000-4000-8000-000000000001}
    DisplayName    REG_SZ    WireDeck
    DisplayVersion    REG_SZ    1.4.2
    InstallLocation    REG_SZ    C:\Program Files\WireDeck\
    DisplayIcon    REG_SZ    "C:\Program Files\WireDeck\WireDeck.exe",0
    UninstallString    REG_SZ    MsiExec.exe /I{1F2E3D4C-0000-4000-8000-000000000001}

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{1F2E3D4C-0000-4000-8000-000000000002}
    DisplayName    REG_SZ    绘图助手
    DisplayVersion    REG_SZ    0.9.0
    InstallLocation    REG_EXPAND_SZ    %LOCALAPPDATA%\DrawingHelper
    DisplayIcon    REG_SZ    C:\Users\Public\DrawingHelper\DrawingHelper.exe

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\NoName
    DisplayVersion    REG_SZ    2.0.0
`

func TestParseUninstallRegistry(t *testing.T) {
	entries := parseUninstallRegistry(uninstallFixture)
	if len(entries) != 3 {
		t.Fatalf("期望解析 3 个注册表项，实际 %d", len(entries))
	}

	first := entries[0]
	if first.DisplayName != "WireDeck" || first.DisplayVersion != "1.4.2" {
		t.Fatalf("第一项名称/版本解析错误：%+v", first)
	}
	if first.InstallLocation != `C:\Program Files\WireDeck\` {
		t.Fatalf("InstallLocation 解析错误：%q", first.InstallLocation)
	}
	if first.DisplayIcon != `"C:\Program Files\WireDeck\WireDeck.exe",0` {
		t.Fatalf("DisplayIcon 解析错误：%q", first.DisplayIcon)
	}

	second := entries[1]
	if second.DisplayName != "绘图助手" || second.DisplayVersion != "0.9.0" {
		t.Fatalf("中文显示名解析错误：%+v", second)
	}
	if second.InstallLocation != `%LOCALAPPDATA%\DrawingHelper` {
		t.Fatalf("REG_EXPAND_SZ 值解析错误：%q", second.InstallLocation)
	}

	if entries[2].DisplayName != "" || entries[2].DisplayVersion != "2.0.0" {
		t.Fatalf("缺少 DisplayName 的项应保留版本且名称为空：%+v", entries[2])
	}
}

func TestCleanExecutablePath(t *testing.T) {
	cases := []struct {
		raw  string
		want string
	}{
		{`"C:\Apps\Foo\foo.exe",0`, `C:\Apps\Foo\foo.exe`},
		{`C:\Apps\Foo\foo.exe,1`, `C:\Apps\Foo\foo.exe`},
		{`C:\Apps\Foo`, `C:\Apps\Foo`},
		{`  "C:\Apps\Foo bar.exe"  `, `C:\Apps\Foo bar.exe`},
	}
	for _, item := range cases {
		if got := cleanExecutablePath(item.raw); got != item.want {
			t.Errorf("cleanExecutablePath(%q) = %q，期望 %q", item.raw, got, item.want)
		}
	}
}

func TestResolveLaunchPath(t *testing.T) {
	existing := map[string]bool{
		`C:\Program Files\WireDeck\WireDeck.exe`: true,
		`C:\Program Files\Broken\broken.exe`:     true,
	}
	exists := func(path string) bool { return existing[path] }
	noFind := func(string) (string, bool) { return "", false }

	t.Run("优先使用存在的 DisplayIcon", func(t *testing.T) {
		entry := registryEntry{
			DisplayIcon:     `"C:\Program Files\WireDeck\WireDeck.exe",0`,
			InstallLocation: `C:\Program Files\WireDeck\`,
		}
		if got := resolveLaunchPath(entry, exists, noFind); got != `C:\Program Files\WireDeck\WireDeck.exe` {
			t.Fatalf("期望使用 DisplayIcon，实际 %q", got)
		}
	})

	t.Run("DisplayIcon 失效时在安装目录中查找", func(t *testing.T) {
		entry := registryEntry{
			DisplayIcon:     `C:\Missing\gone.exe`,
			InstallLocation: `C:\Program Files\Broken`,
		}
		find := func(dir string) (string, bool) {
			if dir == `C:\Program Files\Broken` {
				return `C:\Program Files\Broken\broken.exe`, true
			}
			return "", false
		}
		if got := resolveLaunchPath(entry, exists, find); got != `C:\Program Files\Broken\broken.exe` {
			t.Fatalf("期望回退到 InstallLocation 中的 exe，实际 %q", got)
		}
	})

	t.Run("InstallLocation 直接指向 exe", func(t *testing.T) {
		entry := registryEntry{InstallLocation: `C:\Program Files\Broken\broken.exe`}
		if got := resolveLaunchPath(entry, exists, noFind); got != `C:\Program Files\Broken\broken.exe` {
			t.Fatalf("期望直接使用 InstallLocation，实际 %q", got)
		}
	})

	t.Run("找不到可执行文件时返回空串", func(t *testing.T) {
		entry := registryEntry{
			DisplayIcon:     `C:\Nope\nope.exe`,
			InstallLocation: `C:\Nope`,
		}
		if got := resolveLaunchPath(entry, exists, noFind); got != "" {
			t.Fatalf("期望返回空串，实际 %q", got)
		}
	})
}
