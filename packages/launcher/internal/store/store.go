package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
)

type Installed struct {
	AppKey      string `json:"appKey"`
	Name        string `json:"name"`
	VersionName string `json:"versionName"`
	VersionCode int    `json:"versionCode"`
	InstallPath string `json:"installPath"`
	InstalledAt int64  `json:"installedAt"`
}

type Store struct {
	path string
	apps map[string]Installed
}

func Open() (*Store, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return &Store{apps: map[string]Installed{}}, nil
	}
	base := filepath.Join(dir, "vakaohub")
	if err := os.MkdirAll(base, 0o755); err != nil {
		return nil, err
	}

	s := &Store{
		path: filepath.Join(base, "installed.json"),
		apps: map[string]Installed{},
	}
	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return s, nil
		}
		return nil, err
	}
	var items []Installed
	if err := json.Unmarshal(data, &items); err != nil {
		return s, nil
	}
	for _, item := range items {
		s.apps[item.AppKey] = item
	}
	return s, nil
}

func (s *Store) Get(appKey string) (Installed, bool) {
	item, ok := s.apps[appKey]
	return item, ok
}

func (s *Store) List() []Installed {
	items := make([]Installed, 0, len(s.apps))
	for _, item := range s.apps {
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return items
}

func (s *Store) Put(item Installed) error {
	s.apps[item.AppKey] = item
	return s.save()
}

func (s *Store) Remove(appKey string) error {
	delete(s.apps, appKey)
	return s.save()
}

func (s *Store) save() error {
	items := s.List()
	data, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}
