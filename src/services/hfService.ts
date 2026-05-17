// Developer / Creator: Sadri ERCAN
import {
  AdvancedSearchOptions,
  AppSettings,
  DiskSpaceInfo,
  HFFile,
  HFRepoInfo,
  HFSearchTagsByType,
  RepoType,
  UpdateInfo
} from '../types';

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

function searchTagsApiUrl(repoType: RepoType) {
  if (repoType === 'model') return `${BASE_URL}/models-tags-by-type`;
  if (repoType === 'dataset') return `${BASE_URL}/datasets-tags-by-type`;
  return null;
}

function repoReadmeUrl(repoType: RepoType, repoId: string) {
  const prefix = REPO_ENDPOINTS[repoType].webPrefix;
  return prefix
    ? `${WEB_URL}/${prefix}/${repoId}/raw/main/README.md`
    : `${WEB_URL}/${repoId}/raw/main/README.md`;
}

function modelRawFileUrl(repoId: string, filePath: string) {
  return `${WEB_URL}/${repoId}/raw/main/${filePath}`;
}

const contextLengthCache = new Map<string, number | null>();
const contextLengthKeys = new Set([
  'context_length',
  'max_context_length',
  'max_position_embeddings',
  'model_max_length',
  'n_positions',
  'n_ctx',
  'seq_length',
  'max_seq_len',
  'max_sequence_length',
  'sequence_length',
  'sliding_window',
  'max_source_positions',
  'max_target_positions'
]);

function toValidContextLength(value: unknown): number | null {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.replace(/,/g, '').trim())
      : Number.NaN;

  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.floor(parsed);
  if (rounded <= 0 || rounded > 10_000_000) return null;
  return rounded;
}

function extractContextLength(data: any): number | null {
  const lengths: number[] = [];

  const visit = (value: any) => {
    if (!value || typeof value !== 'object') return;
    Object.entries(value).forEach(([key, entry]) => {
      if (contextLengthKeys.has(key)) {
        const length = toValidContextLength(entry);
        if (length) lengths.push(length);
      }
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        visit(entry);
      }
    });
  };

  visit(data);

  const tags = Array.isArray(data?.tags) ? data.tags : [];
  tags.forEach((tag) => {
    if (typeof tag !== 'string') return;
    const match = tag.match(/(?:context(?:_length)?|model_max_length|max_position_embeddings|n_ctx):(\d[\d,]*)/i);
    const length = match ? toValidContextLength(match[1]) : null;
    if (length) lengths.push(length);
  });

  return lengths.length > 0 ? Math.max(...lengths) : null;
}

async function fetchJsonOrNull(url: string, token?: string) {
  try {
    const response = await fetch(url, { headers: authHeaders(token) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function getModelContextLength(repo: any, token?: string): Promise<number | null> {
  const repoId = repo.id || repo.modelId || repo.name || '';
  if (!repoId) return null;
  if (contextLengthCache.has(repoId)) return contextLengthCache.get(repoId) ?? null;

  let contextLength = extractContextLength(repo);
  if (!contextLength) {
    const config = await fetchJsonOrNull(modelRawFileUrl(repoId, 'config.json'), token);
    contextLength = extractContextLength(config);
  }
  if (!contextLength) {
    const tokenizerConfig = await fetchJsonOrNull(modelRawFileUrl(repoId, 'tokenizer_config.json'), token);
    contextLength = extractContextLength(tokenizerConfig);
  }

  contextLengthCache.set(repoId, contextLength);
  return contextLength;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
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

  async searchAdvancedRepos(options: AdvancedSearchOptions, token?: string): Promise<any[]> {
    const params = new URLSearchParams();
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    const shouldFilterByContext = options.repoType === 'model' && Boolean(options.contextMin);
    const apiLimit = shouldFilterByContext ? 200 : limit;

    if (options.query?.trim()) params.set('search', options.query.trim());
    if (options.author?.trim()) params.set('author', options.author.trim());
    if (options.sort) params.set('sort', options.sort);
    if (options.direction) params.set('direction', options.direction);
    if (options.full) params.set('full', 'true');
    params.set('limit', String(apiLimit));

    if (options.task) {
      if (options.repoType === 'model') {
        params.set('pipeline_tag', options.task);
      } else {
        params.append('filter', options.task);
      }
    }

    if (options.sdk) {
      if (options.repoType === 'space') {
        params.set('sdk', options.sdk);
      } else {
        params.append('filter', options.sdk);
      }
    }

    (options.filters || []).forEach((filter) => {
      if (filter) params.append('filter', filter);
    });

    const response = await fetch(`${repoApiUrl(options.repoType)}?${params.toString()}`, {
      headers: authHeaders(token)
    });
    const results = await readJsonResponse<any[]>(response, 'Advanced search failed');

    if (!shouldFilterByContext || !options.contextMin) return results;

    const enriched = await mapWithConcurrency(results, 8, async (item) => {
      const contextLength = await getModelContextLength(item, token);
      return { ...item, contextLength };
    });

    return enriched
      .filter((item) => (item.contextLength || 0) >= options.contextMin!)
      .slice(0, limit);
  },

  async getSearchTags(repoType: RepoType, token?: string): Promise<HFSearchTagsByType> {
    const url = searchTagsApiUrl(repoType);
    if (!url) return {};

    const response = await fetch(url, { headers: authHeaders(token) });
    if (!response.ok) return {};
    return readJsonResponse<HFSearchTagsByType>(response, 'Failed to load search filters');
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
