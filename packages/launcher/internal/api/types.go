package api

type CatalogResponse struct {
	Platform string       `json:"platform"`
	Arch     string       `json:"arch"`
	Apps     []CatalogApp `json:"apps"`
}

type CatalogApp struct {
	ID          int      `json:"id"`
	AppKey      string   `json:"appKey"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	IconURL     string   `json:"iconUrl"`
	Category    string   `json:"category"`
	RepoURL     string   `json:"repoUrl"`
	Homepage    string   `json:"homepage"`
	Latest      *Release `json:"latest"`
}

type Release struct {
	ID           int        `json:"id"`
	VersionName  string     `json:"versionName"`
	VersionCode  int        `json:"versionCode"`
	Channel      string     `json:"channel"`
	Status       int        `json:"status"`
	ForceUpdate  bool       `json:"forceUpdate"`
	MinVersion   int        `json:"minVersionCode"`
	UpdateLog    string     `json:"updateLog"`
	PublishedAt  int64      `json:"publishedAt"`
	Artifacts    []Artifact `json:"artifacts"`
}

type Artifact struct {
	ID          int    `json:"id"`
	Platform    string `json:"platform"`
	Arch        string `json:"arch"`
	Format      string `json:"format"`
	FileName    string `json:"fileName"`
	Size        int64  `json:"size"`
	SHA256      string `json:"sha256"`
	MinOs       string `json:"minOs"`
	Notarized   bool   `json:"notarized"`
	DownloadURL string `json:"downloadUrl"`
}
