package main

import (
	"os"
	"testing"
)

// 冒烟测试：需要先启动本地分发服务，然后
// VAKAO_HUB_SMOKE=1 go test -run TestSMOKECatalogAndInstall -v .
func TestSMOKECatalogAndInstall(t *testing.T) {
	if os.Getenv("VAKAO_HUB_SMOKE") != "1" {
		t.Skip("set VAKAO_HUB_SMOKE=1 to run")
	}

	app := NewApp()
	app.settings.BaseURL = "http://127.0.0.1:3000/api/v1"

	catalog, err := app.GetCatalog()
	if err != nil {
		t.Fatalf("GetCatalog: %v", err)
	}
	t.Logf("catalog: platform=%s arch=%s apps=%d", catalog.Platform, catalog.Arch, len(catalog.Apps))
	if len(catalog.Apps) == 0 {
		t.Fatal("catalog is empty")
	}

	var target *AppView
	for index := range catalog.Apps {
		if catalog.Apps[index].AppKey == "wiredeck" {
			target = &catalog.Apps[index]
			break
		}
	}
	if target == nil {
		t.Fatal("wiredeck not found in darwin catalog")
	}

	item, err := app.Install("wiredeck", target.ArtifactID)
	if err != nil {
		t.Fatalf("Install: %v", err)
	}
	t.Logf("installed: %s %s -> %s", item.Name, item.VersionName, item.InstallPath)
	if _, err := os.Stat(item.InstallPath); err != nil {
		t.Fatalf("install path missing: %v", err)
	}
}

// 卸载冒烟：安装后调用 Uninstall，确认目录与记录都消失。
func TestSMOKEUninstall(t *testing.T) {
	if os.Getenv("VAKAO_HUB_SMOKE") != "1" {
		t.Skip("set VAKAO_HUB_SMOKE=1 to run")
	}

	app := NewApp()
	item, ok := app.store.Get("wiredeck")
	if !ok {
		t.Skip("wiredeck not installed; run TestSMOKECatalogAndInstall first")
	}

	if err := app.Uninstall("wiredeck", false); err != nil {
		t.Fatalf("Uninstall: %v", err)
	}
	if _, err := os.Stat(item.InstallPath); !os.IsNotExist(err) {
		t.Fatalf("install path still exists: %v", err)
	}
	if _, ok := app.store.Get("wiredeck"); ok {
		t.Fatal("store entry still exists")
	}
}
