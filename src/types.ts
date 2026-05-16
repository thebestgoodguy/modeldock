export type RepoType = 'model' | 'dataset' | 'space';
export type DownloadStatus = 'queued' | 'starting' | 'downloading' | 'paused' | 'completed' | 'failed' | 'canceled' | 'unknown';

export interface HFFile {
  path: string;
  size: number;
  type: 'file' | 'directory';
  selected?: boolean;
}

export interface HFRepoInfo {
  id: string;
  author: string;
  lastModified: string;
  likes: number;
  downloads: number;
  pipeline_tag?: string;
  repoType?: RepoType;
  tags: string[];
  siblings: { rpath: string }[];
}

export interface DownloadItem {
  id: string;
  repoId: string;
  repoType?: RepoType;
  folderName?: string;
  fullPath?: string;
  progress: number;
  speed: string;
  eta?: string;
  downloadedSize?: string;
  status: DownloadStatus;
  savePath?: string;
  timestamp: string;
  logs?: string[];
  isPhysicalOnly?: boolean;
}

export interface AppSettings {
  hf_token: string;
  download_path: string;
  lm_studio_path: string;
  max_concurrent_downloads: string;
  max_workers: string;
  speed_limit_kbps: string;
}

export interface DiskSpaceInfo {
  path: string;
  availableBytes: number | null;
  requiredBytes: number;
  safetyBuffer: number;
  enough: boolean;
}
