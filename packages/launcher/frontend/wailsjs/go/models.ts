export namespace main {
	
	export class AppView {
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
	    installed: boolean;
	    installedVersion: string;
	    installedVersionCode: number;
	    hasUpdate: boolean;
	    running: boolean;
	    installPath: string;
	    duplicates: string[];
	
	    static createFrom(source: any = {}) {
	        return new AppView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.appKey = source["appKey"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.iconUrl = source["iconUrl"];
	        this.category = source["category"];
	        this.homepage = source["homepage"];
	        this.repoUrl = source["repoUrl"];
	        this.docsUrl = source["docsUrl"];
	        this.releaseUrl = source["releaseUrl"];
	        this.themeColor = source["themeColor"];
	        this.latestVersion = source["latestVersion"];
	        this.latestVersionCode = source["latestVersionCode"];
	        this.latestPublishedAt = source["latestPublishedAt"];
	        this.forceUpdate = source["forceUpdate"];
	        this.updateLog = source["updateLog"];
	        this.artifactID = source["artifactID"];
	        this.artifactFormat = source["artifactFormat"];
	        this.artifactSize = source["artifactSize"];
	        this.artifactSha256 = source["artifactSha256"];
	        this.installed = source["installed"];
	        this.installedVersion = source["installedVersion"];
	        this.installedVersionCode = source["installedVersionCode"];
	        this.hasUpdate = source["hasUpdate"];
	        this.running = source["running"];
	        this.installPath = source["installPath"];
	        this.duplicates = source["duplicates"];
	    }
	}
	export class CatalogView {
	    platform: string;
	    arch: string;
	    apps: AppView[];
	
	    static createFrom(source: any = {}) {
	        return new CatalogView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.platform = source["platform"];
	        this.arch = source["arch"];
	        this.apps = this.convertValues(source["apps"], AppView);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Settings {
	    baseUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.baseUrl = source["baseUrl"];
	    }
	}

}

export namespace store {
	
	export class Installed {
	    appKey: string;
	    name: string;
	    versionName: string;
	    versionCode: number;
	    installPath: string;
	    installedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new Installed(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.appKey = source["appKey"];
	        this.name = source["name"];
	        this.versionName = source["versionName"];
	        this.versionCode = source["versionCode"];
	        this.installPath = source["installPath"];
	        this.installedAt = source["installedAt"];
	    }
	}

}

