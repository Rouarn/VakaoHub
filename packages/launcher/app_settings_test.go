package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"vakaohub/launcher/internal/store"
)

// 并发保存/读取设置不得触发 data race（配合 go test -race）。
func TestSettingsConcurrentAccess(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)

	app := NewApp()
	var wg sync.WaitGroup
	for worker := 0; worker < 8; worker++ {
		wg.Add(1)
		go func(worker int) {
			defer wg.Done()
			for i := 0; i < 30; i++ {
				url := fmt.Sprintf("https://example.com/%d/%d", worker, i)
				if _, err := app.SaveSettings(url); err != nil {
					t.Errorf("SaveSettings: %v", err)
					return
				}
				if got := app.GetSettings(); got.BaseURL == "" {
					t.Errorf("GetSettings 返回空地址")
					return
				}
				if got := app.baseURL(); got == "" {
					t.Errorf("baseURL 返回空地址")
					return
				}
			}
		}(worker)
	}
	wg.Wait()

	path := filepath.Join(home, "Library", "Application Support", "vakaohub", "settings.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("读取设置文件: %v", err)
	}
	var persisted Settings
	if err := json.Unmarshal(data, &persisted); err != nil {
		t.Fatalf("解析设置文件: %v", err)
	}
	if persisted.BaseURL == "" {
		t.Fatalf("设置文件中的地址为空")
	}
}

// 配置目录不可用时必须降级为内存 store，不能让 a.store 为 nil。
func TestNewAppFallsBackToMemoryStore(t *testing.T) {
	blocker := filepath.Join(t.TempDir(), "not-a-dir")
	if err := os.WriteFile(blocker, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("HOME", blocker)

	app := NewApp()
	if app.store == nil {
		t.Fatal("store 为 nil")
	}
	item := store.Installed{AppKey: "wiredeck", Name: "WireDeck", InstallPath: "/tmp/wiredeck"}
	if err := app.store.Put(item); err != nil {
		t.Fatalf("内存 store Put: %v", err)
	}
	if _, ok := app.store.Get("wiredeck"); !ok {
		t.Fatal("内存 store 未保存记录")
	}
}
