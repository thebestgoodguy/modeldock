// Developer / Creator: Sadri ERCAN
import { AppSettings, DiskSpaceInfo, HFFile, HFRepoInfo, RepoType, UpdateInfo } from '../types';

declare global {
  interface Window {
    modelDock?: {
      name?: string;
      developer?: string;
      creator?: string;
      version?: string;
      repository?: string;
      backendUrl?: string;
      selectFolder?: (defaultPath?: string) => Promise<string | null>;
    };
  }
}

const BASE_URL = 'https://huggingface.co/api';
const WEB_URL = 'https://huggingface.co';
const DEFAULT_BACKEND_URL = 'http://127.0.0.1:4000/api';

function backendApi(path: string) {
  const baseUrl = window.modelDock?.backendUrl || DEFAULT_BACKEND_URL;
  return `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

const REPO_ENDPOINTS: Record<RepoType, { api: string; webPrefix: string; label: string }> = {
  model: { api: 'models', webPrefix: '', label: 'Model' },
  dataset: { api: 'datasets', webPrefix: 'datasets', label: 'Dataset' },
  space: { api: 'spaces', webPrefix: 'spaces', label: 'Space' }
};

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(
      (typeof data === 'string' && data.trim()) ||
      data?.error ||
      data?.message ||
      fallbackMessage
    );
  }
  return data as T;
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function repoApiUrl(repoType: RepoType, repoId = '') {
  const endpoint = REPO_ENDPOINTS[repoType].api;
  return repoId ? `${BASE_URL}/${endpoint}/${repoId}` : `${BASE_URL}/${endpoint}`;
}

function repoReadmeUrl(repoType: RepoType, repoId: string) {
  const prefix = REPO_ENDPOINTS[repoType].webPrefix;
  return prefix
    ? `${WEB_URL}/${prefix}/${repoId}/raw/main/README.md`
    : `${WEB_URL}/${repoId}/raw/main/README.md`;
}

function normalizeRepoInfo(data: any, repoType: RepoType): HFRepoInfo {
  return {
    id: data.id || data.modelId || data.name,
    author: data.author || String(data.id || '').split('/')[0] || '',
    lastModified: data.lastModified || data.last_modified || data.updatedAt || new Date().toISOString(),
    likes: data.likes || 0,
    downloads: data.downloads || 0,
    pipeline_tag: data.pipeline_tag || data.sdk || REPO_ENDPOINTS[repoType].label,
    repoType,
    tags: data.tags || [],
    siblings: data.siblings || []
  };
}

export const HuggingFaceService = {
  async selectFolder(defaultPath?: string): Promise<string | null> {
    if (window.modelDock?.selectFolder) {
      return await window.modelDock.selectFolder(defaultPath);
    }
    try {
      const response = await fetch(backendApi('/select-folder-fallback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPath })
      });
      const data = await response.json();
      return data.path || null;
    } catch (e) {
      console.error('Select folder fallback failed:', e);
      return null;
    }
  },

  async getRepoInfo(repoId: string, token?: string, repoType: RepoType = 'model'): Promise<HFRepoInfo> {
    const response = await fetch(repoApiUrl(repoType, repoId), { headers: authHeaders(token) });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized: this repository is gated or private. Add an HF token in settings.');
    }

    const data = await readJsonResponse<any>(response, 'Repository not found');
    return normalizeRepoInfo(data, repoType);
  },

  async listFiles(repoId: string, token?: string, repoType: RepoType = 'model'): Promise<HFFile[]> {
    const headers = authHeaders(token);
    const response = await fetch(`${repoApiUrl(repoType, repoId)}/tree/main?recursive=1`, { headers });

    if (!response.ok) {
      const info = await this.getRepoInfo(repoId, token, repoType);
      return (info.siblings || []).map((s) => ({
        path: s.rpath,
        size: 0,
        type: 'file',
        selected: false
      }));
    }

    const tree = await readJsonResponse<any[]>(response, 'Failed to fetch repository files');
    return tree.filter((item: any) => item.type === 'file').map((item: any) => ({
      path: item.path,
      size: item.size || 0,
      type: item.type,
      selected: false
    }));
  },

  async getReadme(repoId: string, token?: string, repoType: RepoType = 'model'): Promise<string> {
    const response = await fetch(repoReadmeUrl(repoType, repoId), { headers: authHeaders(token) });
    if (!response.ok) return '';
    return response.text();
  },

  async startDownload(
    repo: string,
    files: string[],
    savePath: string,
    token?: string,
    mirror = false,
    repoType: RepoType = 'model',
    estimatedBytes = 0,
    options: { maxWorkers?: number; speedLimitKbps?: number } = {}
  ) {
    const response = await fetch(backendApi('/download'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo,
        files,
        path: savePath,
        token,
        mirror,
        repoType,
        estimatedBytes,
        options
      })
    });
    return readJsonResponse<{ downloadId: string; status: string }>(response, 'Failed to start download');
  },

  async listReposByAuthor(author: string, token?: string, repoType: RepoType = 'model'): Promise<any[]> {
    const response = await fetch(
      `${repoApiUrl(repoType)}?author=${encodeURIComponent(author)}&sort=downloads&direction=-1&limit=500`,
      { headers: authHeaders(token) }
    );
    return readJsonResponse<any[]>(response, 'Failed to fetch repositories for this author');
  },

  async searchRepos(query: string, token?: string, repoType: RepoType = 'model'): Promise<any[]> {
    const response = await fetch(
      `${repoApiUrl(repoType)}?search=${encodeURIComponent(query)}&limit=100`,
      { headers: authHeaders(token) }
    );
    return readJsonResponse<any[]>(response, 'Search failed');
  },

  async listModelsByAuthor(author: string, token?: string): Promise<any[]> {
    return this.listReposByAuthor(author, token, 'model');
  },

  async searchModels(query: string, token?: string): Promise<any[]> {
    return this.searchRepos(query, token, 'model');
  },

  async getDownloadStatus(downloadId: string) {
    const response = await fetch(backendApi(`/downloads/${downloadId}/status`));
    return readJsonResponse<any>(response, 'Failed to get download status');
  },

  async getSavedRepos(): Promise<any[]> {
    const response = await fetch(backendApi('/repos'));
    return readJsonResponse<any[]>(response, 'Failed to load saved repositories');
  },

  async saveRepo(repo: any) {
    const response = await fetch(backendApi('/repos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repo)
    });
    return readJsonResponse<any>(response, 'Failed to save repository');
  },

  async deleteRepo(repoId: string) {
    const response = await fetch(backendApi(`/repos/${repoId}`), {
      method: 'DELETE'
    });
    return readJsonResponse<any>(response, 'Failed to delete repository');
  },

  async getSettings(): Promise<Partial<AppSettings>> {
    const response = await fetch(backendApi('/settings'));
    return readJsonResponse<Partial<AppSettings>>(response, 'Failed to load settings');
  },

  async updateSettings(settings: Partial<AppSettings>) {
    const response = await fetch(backendApi('/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return readJsonResponse<any>(response, 'Failed to update settings');
  },

  async getLmStudioPaths() {
    const response = await fetch(backendApi('/paths/lm-studio'));
    return readJsonResponse<{ preferred: string; candidates: { path: string; exists: boolean }[] }>(
      response,
      'Failed to detect LM Studio path'
    );
  },

  async checkDiskSpace(path: string, requiredBytes: number): Promise<DiskSpaceInfo> {
    const response = await fetch(backendApi('/disk-space'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, requiredBytes })
    });
    return readJsonResponse<DiskSpaceInfo>(response, 'Failed to check disk space');
  },

  async getTrendingModels(token?: string) {
    const response = await fetch(`${BASE_URL}/trending`, {
      headers: authHeaders(token)
    });
    if (!response.ok) return [];
    const data = await readJsonResponse<any>(response, 'Failed to load trending models');
    return data.models || [];
  },

  async getPopularModels(token?: string) {
    const response = await fetch(`${BASE_URL}/models?sort=likes&direction=-1&limit=10`, {
      headers: authHeaders(token)
    });
    return readJsonResponse<any[]>(response, 'Failed to load popular models');
  },

  async getDownloadHistory() {
    const response = await fetch(backendApi('/downloads'));
    return readJsonResponse<any[]>(response, 'Failed to load download history');
  },

  async clearDownloadHistory() {
    const response = await fetch(backendApi('/downloads/clear'), {
      method: 'POST'
    });
    return readJsonResponse<any>(response, 'Failed to clear download history');
  },

  async resetAppData() {
    const response = await fetch(backendApi('/reset-app-data'), {
      method: 'POST'
    });
    return readJsonResponse<{ success: boolean; resetAt: string }>(response, 'Failed to reset app data');
  },

  async deleteDownload(id: string) {
    const response = await fetch(backendApi(`/downloads/${id}`), {
      method: 'DELETE'
    });
    return readJsonResponse<any>(response, 'Failed to delete download');
  },

  async cancelDownload(id: string) {
    const response = await fetch(backendApi(`/downloads/${id}/cancel`), { method: 'POST' });
    return readJsonResponse<any>(response, 'Failed to cancel download');
  },

  async pauseDownload(id: string) {
    const response = await fetch(backendApi(`/downloads/${id}/pause`), { method: 'POST' });
    return readJsonResponse<any>(response, 'Failed to pause download');
  },

  async resumeDownload(id: string) {
    const response = await fetch(backendApi(`/downloads/${id}/resume`), { method: 'POST' });
    return readJsonResponse<any>(response, 'Failed to resume download');
  },

  async retryDownload(id: string) {
    const response = await fetch(backendApi(`/downloads/${id}/retry`), { method: 'POST' });
    return readJsonResponse<any>(response, 'Failed to retry download');
  },

  async clearDownloadLogs(id: string) {
    const response = await fetch(backendApi(`/downloads/${id}/logs/clear`), { method: 'POST' });
    return readJsonResponse<any>(response, 'Failed to clear download logs');
  },

  async openDownloadFolder(id: string) {
    const response = await fetch(backendApi(`/downloads/${id}/open`), { method: 'POST' });
    return readJsonResponse<any>(response, 'Failed to open download folder');
  },

  async openFolder(path: string) {
    const response = await fetch(backendApi('/open-folder'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    return readJsonResponse<any>(response, 'Failed to open folder');
  },

  async getPhysicalDownloads() {
    const response = await fetch(backendApi('/downloads/physical'));
    return readJsonResponse<any[]>(response, 'Failed to load downloaded folders');
  },

  async deletePhysicalDownload(folderName: string) {
    const response = await fetch(backendApi('/downloads/physical/delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName })
    });
    return readJsonResponse<any>(response, 'Failed to delete downloaded folder');
  },

  async checkUpdate(currentVersion: string): Promise<UpdateInfo> {
    try {
      const response = await fetch('https://api.github.com/repos/thebestgoodguy/modeldock/releases/latest');
      if (!response.ok) {
        return { hasUpdate: false, latestVersion: currentVersion, currentVersion, changelog: '', downloadUrl: '', releaseUrl: '' };
      }
      const data = await response.json();
      const latestVersion = (data.tag_name || '').replace(/^v/, '');
      const currentClean = currentVersion.replace(/^v/, '');

      const hasUpdate = latestVersion && latestVersion !== currentClean && latestVersion.localeCompare(currentClean, undefined, { numeric: true }) > 0;
      let downloadUrl = data.html_url || '';
      if (Array.isArray(data.assets) && data.assets.length > 0) {
        const asset = data.assets.find((a: any) => a.name.endsWith('.exe')) || data.assets[0];
        downloadUrl = asset.browser_download_url || downloadUrl;
      }

      return {
        hasUpdate: Boolean(hasUpdate),
        latestVersion: latestVersion || currentClean,
        currentVersion: currentClean,
        changelog: data.body || 'No changelog provided.',
        downloadUrl,
        releaseUrl: data.html_url || 'https://github.com/thebestgoodguy/modeldock/releases'
      };
    } catch (e) {
      return { hasUpdate: false, latestVersion: currentVersion, currentVersion, changelog: '', downloadUrl: '', releaseUrl: '' };
    }
  }
};
