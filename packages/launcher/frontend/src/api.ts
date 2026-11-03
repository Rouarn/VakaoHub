export interface Settings {
  baseUrl: string;
}

export interface Progress {
  appKey: string;
  phase: string;
  percent: number;
  message: string;
}

export interface AppView {
  appKey: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  homepage: string;
  repoUrl: string;
  docsUrl: string;
  releaseUrl: string;
  themeColor: string;
  latestVersion: string;
  latestVersionCode: number;
  latestPublishedAt: number;
  forceUpdate: boolean;
  updateLog: string;
  artifactID: number;
  artifactFormat: string;
  artifactSize: number;
  artifactSha256: string;
  minOs: string;
  installed: boolean;
  installedVersion: string;
  installedVersionCode: number;
  hasUpdate: boolean;
  running: boolean;
  installPath: string;
  duplicates: string[];
}

export interface CatalogView {
  platform: string;
  arch: string;
  osVersion: string;
  apps: AppView[];
}

export interface Installed {
  appKey: string;
  name: string;
  versionName: string;
  versionCode: number;
  installPath: string;
  installedAt: number;
}

interface WailsApp {
  GetAppVersion(): Promise<string>;
  GetSettings(): Promise<Settings>;
  SaveSettings(baseUrl: string): Promise<Settings>;
  GetCatalog(): Promise<CatalogView>;
  Install(appKey: string, artifactID: number): Promise<Installed>;
  Launch(appKey: string): Promise<void>;
  Uninstall(appKey: string, deleteData: boolean): Promise<void>;
  Reveal(appKey: string): Promise<void>;
  OpenURL(url: string): void;
}

export function appApi(): WailsApp {
  const bridge = (window as unknown as {
    go?: { main?: { App?: WailsApp } };
  }).go;
  const api = bridge?.main?.App;
  if (!api) {
    throw new Error('Wails 运行时未就绪，请通过桌面应用启动');
  }
  return api;
}
