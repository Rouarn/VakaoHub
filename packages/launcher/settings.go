package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

const defaultBaseURL = "http://127.0.0.1:3000/api/v1"

type Settings struct {
	BaseURL string `json:"baseUrl"`
}

func configDir() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "vakaohub"), nil
}

func loadSettings() Settings {
	settings := Settings{BaseURL: defaultBaseURL}
	dir, err := configDir()
	if err != nil {
		return settings
	}
	data, err := os.ReadFile(filepath.Join(dir, "settings.json"))
	if err != nil {
		return settings
	}
	if err := json.Unmarshal(data, &settings); err != nil {
		return Settings{BaseURL: defaultBaseURL}
	}
	settings.BaseURL = strings.TrimRight(strings.TrimSpace(settings.BaseURL), "/")
	if settings.BaseURL == "" {
		settings.BaseURL = defaultBaseURL
	}
	return settings
}

func saveSettings(settings Settings) error {
	dir, err := configDir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	tmp := filepath.Join(dir, "settings.json.tmp")
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, filepath.Join(dir, "settings.json"))
}
