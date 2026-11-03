package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"vakaohub/launcher/internal/api"
	"vakaohub/launcher/internal/install"
	"vakaohub/launcher/internal/store"
)

// App 是暴露给前端的方法集合。
type App struct {
	ctx      context.Context
	mu       sync.Mutex
	settings Settings
	store    *store.Store
}

func NewApp() *App {
	s, err := store.Open()
	if err != nil {
		fmt.Println("读取已安装列表失败：", err)
	}
	return &App{
		settings: loadSettings(),
		store:    s,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) httpContext() context.Context {
	if a.ctx != nil {
		return a.ctx
	}
	return context.Background()
}

// Progress 通过 Wails 事件推送给前端。
type Progress struct {
	AppKey  string `json:"appKey"`
	Phase   string `json:"phase"`
	Percent int    `json:"percent"`
	Message string `json:"message"`
}

type AppView struct {
	AppKey               string   `json:"appKey"`
	Name                 string   `json:"name"`
	Description          string   `json:"description"`
	IconURL              string   `json:"iconUrl"`
	Category             string   `json:"category"`
	Homepage             string   `json:"homepage"`
	RepoURL              string   `json:"repoUrl"`
	DocsURL              string   `json:"docsUrl"`
	ReleaseURL           string   `json:"releaseUrl"`
	ThemeColor           string   `json:"themeColor"`
	LatestVersion        string   `json:"latestVersion"`
	LatestVersionCode    int      `json:"latestVersionCode"`
	LatestPublishedAt    int64    `json:"latestPublishedAt"`
	ForceUpdate          bool     `json:"forceUpdate"`
	UpdateLog            string   `json:"updateLog"`
	ArtifactID           int      `json:"artifactID"`
	ArtifactFormat       string   `json:"artifactFormat"`
	ArtifactSize         int64    `json:"artifactSize"`
	ArtifactSHA256       string   `json:"artifactSha256"`
	Installed            bool     `json:"installed"`
	InstalledVersion     string   `json:"installedVersion"`
	InstalledVersionCode int      `json:"installedVersionCode"`
	HasUpdate            bool     `json:"hasUpdate"`
	Running              bool     `json:"running"`
	InstallPath          string   `json:"installPath"`
	Duplicates           []string `json:"duplicates"`
}

type CatalogView struct {
	Platform string    `json:"platform"`
	Arch     string    `json:"arch"`
	Apps     []AppView `json:"apps"`
}

func (a *App) GetSettings() Settings {
	return a.settings
}

func (a *App) SaveSettings(baseURL string) (Settings, error) {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		return a.settings, fmt.Errorf("服务地址不能为空")
	}
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		return a.settings, fmt.Errorf("服务地址必须以 http:// 或 https:// 开头")
	}
	a.settings.BaseURL = baseURL
	if err := saveSettings(a.settings); err != nil {
		return a.settings, err
	}
	return a.settings, nil
}

func (a *App) GetCatalog() (CatalogView, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.catalogLocked()
}

func (a *App) catalogLocked() (CatalogView, error) {
	platform, arch := platformInfo()
	client := api.New(a.settings.BaseURL)
	response, err := client.Catalog(a.httpContext(), platform, arch)
	if err != nil {
		return CatalogView{}, err
	}

	view := CatalogView{Platform: platform, Arch: arch, Apps: make([]AppView, 0, len(response.Apps))}
	for _, app := range response.Apps {
		if app.Latest == nil || len(app.Latest.Artifacts) == 0 {
			continue
		}
		artifact := pickArtifact(app.Latest.Artifacts, platform, arch)
		if artifact == nil {
			continue
		}

		item := AppView{
			AppKey:            app.AppKey,
			Name:              app.Name,
			Description:       app.Description,
			IconURL:           app.IconURL,
			Category:          app.Category,
			Homepage:          app.Homepage,
			RepoURL:           app.RepoURL,
			DocsURL:           app.DocsURL,
			ReleaseURL:        app.ReleaseURL,
			ThemeColor:        app.ThemeColor,
			LatestVersion:     app.Latest.VersionName,
			LatestVersionCode: app.Latest.VersionCode,
			LatestPublishedAt: app.Latest.PublishedAt,
			ForceUpdate:       app.Latest.ForceUpdate,
			UpdateLog:         app.Latest.UpdateLog,
			ArtifactID:        artifact.ID,
			ArtifactFormat:    artifact.Format,
			ArtifactSize:      artifact.Size,
			ArtifactSHA256:    artifact.SHA256,
		}

		detected := install.FindApps(app.Name)
		installedPath := ""
		installedVersion := ""
		installedCode := 0

		if app.AppKey == "vakaohub" {
			if path, version, ok := install.CurrentBundle(); ok {
				item.Installed = true
				item.Running = true
				item.InstallPath = path
				installedPath = path
				installedVersion = version
			}
		}

		if !item.Installed {
			if record, ok := a.store.Get(app.AppKey); ok {
				if _, statErr := os.Stat(record.InstallPath); statErr == nil {
					item.Installed = true
					item.InstallPath = record.InstallPath
					installedPath = record.InstallPath
					installedVersion = record.VersionName
					installedCode = record.VersionCode
				} else {
					_ = a.store.Remove(app.AppKey)
				}
			}
		}

		if !item.Installed && len(detected) > 0 {
			item.Installed = true
			item.InstallPath = detected[0].Path
			installedPath = detected[0].Path
			installedVersion = detected[0].Version
			_ = a.store.Put(store.Installed{
				AppKey:      app.AppKey,
				Name:        app.Name,
				VersionName: installedVersion,
				VersionCode: 0,
				InstallPath: detected[0].Path,
				InstalledAt: time.Now().Unix(),
			})
		}

		if item.Installed {
			item.InstalledVersion = installedVersion
			item.InstalledVersionCode = installedCode
			if installedCode > 0 {
				item.HasUpdate = installedCode < app.Latest.VersionCode
			} else {
				item.HasUpdate = isNewerVersion(app.Latest.VersionName, installedVersion)
			}
		}

		for _, found := range detected {
			if found.Path != installedPath {
				item.Duplicates = append(item.Duplicates, found.Path)
			}
		}

		view.Apps = append(view.Apps, item)
	}
	return view, nil
}

// Install 下载、校验并安装指定产物。
func (a *App) Install(appKey string, artifactID int) (store.Installed, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	platform, arch := platformInfo()
	client := api.New(a.settings.BaseURL)
	response, err := client.Catalog(a.httpContext(), platform, arch)
	if err != nil {
		return store.Installed{}, err
	}

	var app *api.CatalogApp
	var artifact *api.Artifact
	for i := range response.Apps {
		if response.Apps[i].AppKey != appKey || response.Apps[i].Latest == nil {
			continue
		}
		app = &response.Apps[i]
		for j := range app.Latest.Artifacts {
			if app.Latest.Artifacts[j].ID == artifactID {
				artifact = &app.Latest.Artifacts[j]
				break
			}
		}
		break
	}
	if app == nil || artifact == nil {
		return store.Installed{}, fmt.Errorf("未找到该应用或产物")
	}
	if appKey == "vakaohub" {
		return store.Installed{}, fmt.Errorf("启动器不能通过自身安装；请下载新版本手动替换")
	}

	a.emit(appKey, "preparing", -1, "准备下载")
	tmpDir, err := os.MkdirTemp("", "vakaohub-install-*")
	if err != nil {
		return store.Installed{}, err
	}
	defer os.RemoveAll(tmpDir)

	fileName := artifact.FileName
	if fileName == "" {
		fileName = fmt.Sprintf("%s.%s", appKey, artifact.Format)
	}
	filePath := filepath.Join(tmpDir, filepath.Base(fileName))

	sha, err := a.download(appKey, artifact.DownloadURL, artifact.ID, filePath, artifact.Size)
	if err != nil {
		a.emit(appKey, "error", -1, err.Error())
		return store.Installed{}, err
	}

	a.emit(appKey, "verifying", 100, "校验 SHA-256")
	if !strings.EqualFold(sha, artifact.SHA256) {
		message := fmt.Sprintf("校验失败：期望 %s，实际 %s", artifact.SHA256, sha)
		a.emit(appKey, "error", -1, message)
		return store.Installed{}, fmt.Errorf("%s", message)
	}

	existingPath := ""
	if record, ok := a.store.Get(appKey); ok {
		if _, statErr := os.Stat(record.InstallPath); statErr == nil {
			existingPath = record.InstallPath
		}
	}
	if existingPath == "" {
		if found := install.FindApps(app.Name); len(found) > 0 {
			existingPath = found[0].Path
		}
	}

	a.emit(appKey, "installing", 100, "正在安装")
	installPath, err := install.Install(artifact.Format, filePath, app.AppKey, app.Name, existingPath)
	if err != nil {
		a.emit(appKey, "error", -1, err.Error())
		return store.Installed{}, err
	}

	item := store.Installed{
		AppKey:      app.AppKey,
		Name:        app.Name,
		VersionName: app.Latest.VersionName,
		VersionCode: app.Latest.VersionCode,
		InstallPath: installPath,
		InstalledAt: time.Now().Unix(),
	}
	if err := a.store.Put(item); err != nil {
		return store.Installed{}, err
	}

	a.emit(appKey, "done", 100, "安装完成")
	return item, nil
}

func (a *App) Uninstall(appKey string, deleteData bool) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if appKey == "vakaohub" {
		return fmt.Errorf("不能卸载正在运行的启动器")
	}

	item, ok := a.store.Get(appKey)
	if !ok {
		return fmt.Errorf("尚未安装该应用")
	}

	bundleID := ""
	if deleteData {
		value, err := install.BundleID(item.InstallPath)
		if err != nil {
			return err
		}
		bundleID = value
	}

	if err := install.Remove(item.InstallPath); err != nil {
		return err
	}
	_ = a.store.Remove(appKey)

	if deleteData {
		return install.RemoveData(bundleID)
	}
	return nil
}

func (a *App) Launch(appKey string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	item, ok := a.store.Get(appKey)
	if !ok {
		return fmt.Errorf("尚未安装该应用")
	}
	return install.Launch(item.InstallPath)
}

// Reveal 在系统文件管理器中选中应用。
func (a *App) Reveal(appKey string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	path := ""
	if appKey == "vakaohub" {
		if current, _, ok := install.CurrentBundle(); ok {
			path = current
		}
	}
	if path == "" {
		item, ok := a.store.Get(appKey)
		if !ok {
			return fmt.Errorf("尚未安装该应用")
		}
		path = item.InstallPath
	}
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("安装目录不存在：%s", path)
	}
	return install.Reveal(path)
}

func (a *App) OpenURL(url string) {
	if a.ctx != nil {
		wruntime.BrowserOpenURL(a.ctx, url)
	}
}

func (a *App) emit(appKey, phase string, percent int, message string) {
	if a.ctx == nil {
		return
	}
	wruntime.EventsEmit(a.ctx, "install:progress", Progress{
		AppKey:  appKey,
		Phase:   phase,
		Percent: percent,
		Message: message,
	})
}

func (a *App) download(appKey, url string, artifactID int, dest string, expectedSize int64) (string, error) {
	cache, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	directory := filepath.Join(cache, "vakaohub", "downloads")
	if err := os.MkdirAll(directory, 0o755); err != nil {
		return "", err
	}
	partPath := filepath.Join(directory, fmt.Sprintf("%d.part", artifactID))

	var start int64
	if info, err := os.Stat(partPath); err == nil {
		start = info.Size()
	}
	if expectedSize > 0 && start > expectedSize {
		start = 0
		_ = os.Remove(partPath)
	}

	request, err := http.NewRequestWithContext(a.httpContext(), http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	if start > 0 {
		request.Header.Set("Range", fmt.Sprintf("bytes=%d-", start))
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	complete := false
	switch response.StatusCode {
	case http.StatusPartialContent:
		// 续传：保留已有部分，追加写入
	case http.StatusOK:
		// 服务端不支持 Range 或文件已变化，从头开始
		start = 0
	case http.StatusRequestedRangeNotSatisfiable:
		if expectedSize > 0 && start == expectedSize {
			complete = true
		} else {
			return "", fmt.Errorf("下载失败：HTTP %d", response.StatusCode)
		}
	default:
		return "", fmt.Errorf("下载失败：HTTP %d", response.StatusCode)
	}

	if !complete {
		flags := os.O_CREATE | os.O_WRONLY
		if start > 0 {
			flags |= os.O_APPEND
		} else {
			flags |= os.O_TRUNC
		}
		file, err := os.OpenFile(partPath, flags, 0o644)
		if err != nil {
			return "", err
		}

		total := expectedSize
		if total <= 0 && response.ContentLength > 0 {
			total = start + response.ContentLength
		}
		received := start
		lastPercent := -1
		lastEmit := time.Now()
		buffer := make([]byte, 128*1024)

		for {
			n, readErr := response.Body.Read(buffer)
			if n > 0 {
				if _, err := file.Write(buffer[:n]); err != nil {
					file.Close()
					return "", err
				}
				received += int64(n)
				percent := -1
				if total > 0 {
					percent = int(received * 100 / total)
					if percent > 100 {
						percent = 100
					}
				}
				if percent != lastPercent && time.Since(lastEmit) > 80*time.Millisecond {
					lastPercent = percent
					lastEmit = time.Now()
					a.emit(appKey, "downloading", percent, "下载中")
				}
			}
			if readErr == io.EOF {
				break
			}
			if readErr != nil {
				file.Close()
				return "", readErr
			}
		}
		if err := file.Close(); err != nil {
			return "", err
		}
	}

	if expectedSize > 0 {
		info, err := os.Stat(partPath)
		if err != nil {
			return "", err
		}
		if info.Size() != expectedSize {
			return "", fmt.Errorf("下载不完整：期望 %d 字节，实际 %d 字节", expectedSize, info.Size())
		}
	}

	a.emit(appKey, "downloading", 100, "下载完成")
	sha, err := fileSHA256(partPath)
	if err != nil {
		return "", err
	}
	if err := os.Rename(partPath, dest); err != nil {
		return "", err
	}
	return sha, nil
}

func fileSHA256(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func platformInfo() (string, string) {
	platform := "linux"
	switch runtime.GOOS {
	case "darwin":
		platform = "darwin"
	case "windows":
		platform = "win32"
	}

	arch := "universal"
	switch runtime.GOARCH {
	case "arm64":
		arch = "arm64"
	case "amd64":
		arch = "x64"
	}
	return platform, arch
}

func pickArtifact(artifacts []api.Artifact, platform, arch string) *api.Artifact {
	preference := map[string][]string{
		"android": {"apk", "zip"},
		"darwin":  {"dmg", "zip"},
		"win32":   {"msi", "exe", "zip"},
		"linux":   {"appimage", "deb", "zip"},
	}[platform]

	var best *api.Artifact
	bestScore := 1 << 30
	for i := range artifacts {
		artifact := &artifacts[i]
		if artifact.Platform != platform {
			continue
		}
		if artifact.Arch != arch && artifact.Arch != "universal" {
			continue
		}

		archScore := 1
		if artifact.Arch == arch {
			archScore = 0
		}
		formatScore := len(preference)
		for index, format := range preference {
			if artifact.Format == format {
				formatScore = index
				break
			}
		}
		score := archScore*100 + formatScore
		if score < bestScore {
			bestScore = score
			best = artifact
		}
	}
	return best
}
