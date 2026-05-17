// Developer / Creator: Sadri ERCAN
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Box,
  Braces,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  ExternalLink,
  Filter,
  Gauge,
  Heart,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X
} from 'lucide-react';
import { HuggingFaceService } from '../services/hfService';
import { HFSearchTag, HFSearchTagsByType, RepoType } from '../types';

type NotifyType = 'success' | 'error' | 'info' | 'warning';

interface AdvancedSearchPageProps {
  repoType: RepoType;
  hfToken?: string;
  onRepoTypeChange: (repoType: RepoType) => void;
  onSelectRepo: (repoId: string, repoType: RepoType) => void;
  onNotify: (message: string, type?: NotifyType) => void;
}

interface FilterSection {
  id: string;
  title: string;
  tags: HFSearchTag[];
  mode: 'single' | 'multi' | 'sdk';
}

const repoTypeItems: { id: RepoType; label: string; icon: typeof Box }[] = [
  { id: 'model', label: 'Models', icon: Box },
  { id: 'dataset', label: 'Datasets', icon: Database },
  { id: 'space', label: 'Spaces', icon: Braces }
];

const sortOptions = [
  { value: 'downloads', label: 'Downloads' },
  { value: 'likes', label: 'Likes' },
  { value: 'lastModified', label: 'Updated' },
  { value: 'createdAt', label: 'Created' },
  { value: 'trendingScore', label: 'Trending' }
];

const contextLengthOptions = [
  { value: 2048, label: '2K+' },
  { value: 4096, label: '4K+' },
  { value: 8192, label: '8K+' },
  { value: 16384, label: '16K+' },
  { value: 32768, label: '32K+' },
  { value: 65536, label: '64K+' },
  { value: 131072, label: '128K+' },
  { value: 262144, label: '256K+' }
];

const RESULTS_PER_PAGE = 24;

const fallbackTags: Record<RepoType, HFSearchTagsByType> = {
  model: {
    pipeline_tag: [
      { id: 'text-generation', label: 'Text Generation', type: 'pipeline_tag' },
      { id: 'image-text-to-text', label: 'Image-Text-to-Text', type: 'pipeline_tag' },
      { id: 'text-to-image', label: 'Text-to-Image', type: 'pipeline_tag' },
      { id: 'automatic-speech-recognition', label: 'Speech Recognition', type: 'pipeline_tag' },
      { id: 'text-classification', label: 'Text Classification', type: 'pipeline_tag' },
      { id: 'sentence-similarity', label: 'Sentence Similarity', type: 'pipeline_tag' },
      { id: 'token-classification', label: 'Token Classification', type: 'pipeline_tag' },
      { id: 'image-classification', label: 'Image Classification', type: 'pipeline_tag' }
    ],
    library: [
      { id: 'transformers', label: 'Transformers', type: 'library' },
      { id: 'diffusers', label: 'Diffusers', type: 'library' },
      { id: 'safetensors', label: 'Safetensors', type: 'library' },
      { id: 'gguf', label: 'GGUF', type: 'library' },
      { id: 'pytorch', label: 'PyTorch', type: 'library' },
      { id: 'onnx', label: 'ONNX', type: 'library' },
      { id: 'mlx', label: 'MLX', type: 'library' },
      { id: 'peft', label: 'PEFT', type: 'library' }
    ],
    language: [
      { id: 'en', label: 'English', type: 'language' },
      { id: 'tr', label: 'Turkish', type: 'language' },
      { id: 'zh', label: 'Chinese', type: 'language' },
      { id: 'fr', label: 'French', type: 'language' },
      { id: 'de', label: 'German', type: 'language' },
      { id: 'ja', label: 'Japanese', type: 'language' }
    ],
    license: [
      { id: 'license:apache-2.0', label: 'apache-2.0', type: 'license' },
      { id: 'license:mit', label: 'mit', type: 'license' },
      { id: 'license:cc-by-4.0', label: 'cc-by-4.0', type: 'license' },
      { id: 'license:cc-by-nc-4.0', label: 'cc-by-nc-4.0', type: 'license' },
      { id: 'license:openrail', label: 'openrail', type: 'license' },
      { id: 'license:other', label: 'other', type: 'license' }
    ],
    other: [
      { id: '4-bit', label: '4-bit precision', type: 'other' },
      { id: '8-bit', label: '8-bit precision', type: 'other' },
      { id: 'merge', label: 'Merge', type: 'other' },
      { id: 'custom_code', label: 'Custom code', type: 'other' },
      { id: 'endpoints_compatible', label: 'Inference Endpoints', type: 'other' }
    ]
  },
  dataset: {
    task_categories: [
      { id: 'task_categories:text-classification', label: 'Text Classification', type: 'task_categories' },
      { id: 'task_categories:question-answering', label: 'Question Answering', type: 'task_categories' },
      { id: 'task_categories:translation', label: 'Translation', type: 'task_categories' },
      { id: 'task_categories:summarization', label: 'Summarization', type: 'task_categories' },
      { id: 'task_categories:image-classification', label: 'Image Classification', type: 'task_categories' }
    ],
    modality: [
      { id: 'modality:text', label: 'Text', type: 'modality' },
      { id: 'modality:image', label: 'Image', type: 'modality' },
      { id: 'modality:audio', label: 'Audio', type: 'modality' },
      { id: 'modality:video', label: 'Video', type: 'modality' },
      { id: 'modality:tabular', label: 'Tabular', type: 'modality' }
    ],
    format: [
      { id: 'format:parquet', label: 'parquet', type: 'format' },
      { id: 'format:json', label: 'json', type: 'format' },
      { id: 'format:csv', label: 'csv', type: 'format' },
      { id: 'format:imagefolder', label: 'imagefolder', type: 'format' },
      { id: 'format:webdataset', label: 'webdataset', type: 'format' }
    ],
    language: [
      { id: 'language:en', label: 'English', type: 'language' },
      { id: 'language:tr', label: 'Turkish', type: 'language' },
      { id: 'language:zh', label: 'Chinese', type: 'language' },
      { id: 'language:fr', label: 'French', type: 'language' },
      { id: 'language:de', label: 'German', type: 'language' }
    ],
    license: [
      { id: 'license:apache-2.0', label: 'apache-2.0', type: 'license' },
      { id: 'license:mit', label: 'mit', type: 'license' },
      { id: 'license:cc-by-4.0', label: 'cc-by-4.0', type: 'license' },
      { id: 'license:cc0-1.0', label: 'cc0-1.0', type: 'license' }
    ]
  },
  space: {
    sdk: [
      { id: 'gradio', label: 'Gradio', type: 'sdk' },
      { id: 'streamlit', label: 'Streamlit', type: 'sdk' },
      { id: 'docker', label: 'Docker', type: 'sdk' },
      { id: 'static', label: 'Static', type: 'sdk' }
    ],
    other: [
      { id: 'mcp-server', label: 'MCP server', type: 'other' },
      { id: 'persistent-storage', label: 'Persistent storage', type: 'other' },
      { id: 'gpu', label: 'GPU', type: 'other' },
      { id: 'region:us', label: 'US region', type: 'other' },
      { id: 'region:eu', label: 'EU region', type: 'other' }
    ]
  }
};

function getRepoLabel(repoType: RepoType) {
  if (repoType === 'dataset') return 'Dataset';
  if (repoType === 'space') return 'Space';
  return 'Model';
}

function resultId(result: any) {
  return result.id || result.modelId || result.name || '';
}

function repoParts(id: string) {
  const [owner, ...nameParts] = id.split('/');
  return {
    owner: owner || id,
    name: nameParts.join('/') || id
  };
}

function compactNumber(value: number | undefined) {
  const number = value || 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return String(number);
}

function formatContextLength(value: number | undefined) {
  if (!value) return '';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1024) return `${Math.round(value / 1024)}K`;
  return String(value);
}

function repoUrl(repoType: RepoType, id: string) {
  if (repoType === 'dataset') return `https://huggingface.co/datasets/${id}`;
  if (repoType === 'space') return `https://huggingface.co/spaces/${id}`;
  return `https://huggingface.co/${id}`;
}

function mergeTagGroups(repoType: RepoType, remote: HFSearchTagsByType) {
  return {
    ...fallbackTags[repoType],
    ...remote
  };
}

function getSections(repoType: RepoType, tags: HFSearchTagsByType): FilterSection[] {
  if (repoType === 'dataset') {
    return [
      { id: 'dataset-tasks', title: 'Tasks', tags: tags.task_categories || [], mode: 'single' },
      { id: 'dataset-modalities', title: 'Modalities', tags: tags.modality || [], mode: 'multi' },
      { id: 'dataset-formats', title: 'Formats', tags: tags.format || [], mode: 'multi' },
      { id: 'dataset-languages', title: 'Languages', tags: tags.language || [], mode: 'multi' },
      { id: 'dataset-licenses', title: 'Licenses', tags: tags.license || [], mode: 'multi' },
      { id: 'dataset-libraries', title: 'Libraries', tags: tags.library || [], mode: 'multi' }
    ];
  }

  if (repoType === 'space') {
    return [
      { id: 'space-sdk', title: 'SDK', tags: tags.sdk || [], mode: 'sdk' },
      { id: 'space-tags', title: 'Tags', tags: tags.other || [], mode: 'multi' }
    ];
  }

  return [
    { id: 'model-tasks', title: 'Tasks', tags: tags.pipeline_tag || [], mode: 'single' },
    { id: 'model-libraries', title: 'Libraries', tags: tags.library || [], mode: 'multi' },
    { id: 'model-languages', title: 'Languages', tags: tags.language || [], mode: 'multi' },
    { id: 'model-licenses', title: 'Licenses', tags: tags.license || [], mode: 'multi' },
    { id: 'model-other', title: 'Other', tags: tags.other || [], mode: 'multi' }
  ];
}

export const AdvancedSearchPage = ({
  repoType,
  hfToken,
  onRepoTypeChange,
  onSelectRepo,
  onNotify
}: AdvancedSearchPageProps) => {
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSdk, setSelectedSdk] = useState('');
  const [selectedContextMin, setSelectedContextMin] = useState<number | null>(null);
  const [sort, setSort] = useState('downloads');
  const [direction, setDirection] = useState<'1' | '-1'>('-1');
  const [limit, setLimit] = useState(50);
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [tagGroups, setTagGroups] = useState<HFSearchTagsByType>(fallbackTags[repoType]);
  const [tagLoading, setTagLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setTagGroups(fallbackTags[repoType]);
    setTagLoading(true);

    HuggingFaceService.getSearchTags(repoType, hfToken)
      .then((remoteTags) => {
        if (alive) setTagGroups(mergeTagGroups(repoType, remoteTags));
      })
      .catch(() => {
        if (alive) setTagGroups(fallbackTags[repoType]);
      })
      .finally(() => {
        if (alive) setTagLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [repoType, hfToken]);

  useEffect(() => {
    let alive = true;
    setSelectedTask('');
    setSelectedTags([]);
    setSelectedSdk('');
    setSelectedContextMin(null);
    setExpandedSections([]);
    setFilterQuery('');
    setResults([]);
    setLoading(true);

    HuggingFaceService.searchAdvancedRepos(
      { repoType, sort: 'downloads', direction: '-1', limit, full: true },
      hfToken
    )
      .then((items) => {
        if (alive) setResults(items);
      })
      .catch((error: any) => {
        if (alive) onNotify(error.message || 'Advanced search failed', 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [repoType, hfToken]);

  const sections = useMemo(() => getSections(repoType, tagGroups), [repoType, tagGroups]);

  const tagLookup = useMemo(() => {
    const lookup = new Map<string, HFSearchTag>();
    sections.forEach((section) => {
      section.tags.forEach((tag) => lookup.set(tag.id, tag));
    });
    return lookup;
  }, [sections]);

  const activeFilterCount =
    Number(Boolean(selectedTask)) +
    Number(Boolean(selectedSdk)) +
    selectedTags.length +
    Number(Boolean(author.trim())) +
    Number(repoType === 'model' && Boolean(selectedContextMin));

  const totalPages = Math.max(1, Math.ceil(results.length / RESULTS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = results.length === 0 ? 0 : (activePage - 1) * RESULTS_PER_PAGE;
  const pageEnd = Math.min(pageStart + RESULTS_PER_PAGE, results.length);
  const paginatedResults = results.slice(pageStart, pageEnd);
  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [results]);

  const runSearch = async () => {
    setLoading(true);
    try {
      const items = await HuggingFaceService.searchAdvancedRepos(
        {
          repoType,
          query,
          author,
          task: selectedTask,
          sdk: selectedSdk,
          filters: selectedTags,
          contextMin: repoType === 'model' ? selectedContextMin || undefined : undefined,
          sort,
          direction,
          limit,
          full: true
        },
        hfToken
      );
      setResults(items);
      if (items.length === 0) onNotify('No repositories matched these filters', 'info');
    } catch (error: any) {
      onNotify(error.message || 'Advanced search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setAuthor('');
    setSelectedTask('');
    setSelectedTags([]);
    setSelectedSdk('');
    setSelectedContextMin(null);
    setSort('downloads');
    setDirection('-1');
    setLimit(50);
    setFilterQuery('');
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((item) => item !== tagId) : [...prev, tagId]
    );
  };

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((item) => item !== sectionId) : [...prev, sectionId]
    );
  };

  const changeRepoType = (nextRepoType: RepoType) => {
    if (nextRepoType === repoType) return;
    onRepoTypeChange(nextRepoType);
  };

  const renderFilterSection = (section: FilterSection) => {
    const filterText = filterQuery.trim().toLowerCase();
    const matchingTags = section.tags.filter((tag) =>
      !filterText || tag.label.toLowerCase().includes(filterText) || tag.id.toLowerCase().includes(filterText)
    );
    const expanded = expandedSections.includes(section.id);
    const visibleTags = (expanded ? matchingTags : matchingTags.slice(0, 10)).slice(0, 80);

    if (matchingTags.length === 0) return null;

    return (
      <div key={section.id} className="border-b border-zinc-900/80 pb-4 last:border-b-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{section.title}</h3>
          <span className="text-[10px] font-bold text-zinc-600">{matchingTags.length}</span>
        </div>
        <div className="grid gap-1">
          {visibleTags.map((tag) => {
            const active =
              (section.mode === 'single' && selectedTask === tag.id) ||
              (section.mode === 'sdk' && selectedSdk === tag.id) ||
              (section.mode === 'multi' && selectedTags.includes(tag.id));

            return (
              <button
                key={tag.id}
                onClick={() => {
                  if (section.mode === 'single') setSelectedTask((prev) => (prev === tag.id ? '' : tag.id));
                  if (section.mode === 'sdk') setSelectedSdk((prev) => (prev === tag.id ? '' : tag.id));
                  if (section.mode === 'multi') toggleTag(tag.id);
                }}
                className={`group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all ${
                  active
                    ? 'bg-hf-purple/15 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
                }`}
              >
                <span className="min-w-0 truncate text-xs font-bold">{tag.label}</span>
                {active ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-hf-purple" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-700 group-hover:border-zinc-500" />
                )}
              </button>
            );
          })}
        </div>
        {matchingTags.length > 10 && (
          <button
            onClick={() => toggleExpanded(section.id)}
            className="mt-2 w-full rounded-xl px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-900/70 hover:text-zinc-300 transition-all"
          >
            {expanded ? 'Show less' : `Show ${Math.min(matchingTags.length - 10, 70)} more`}
          </button>
        )}
      </div>
    );
  };

  const renderContextLengthSection = () => {
    if (repoType !== 'model') return null;

    const filterText = filterQuery.trim().toLowerCase();
    const matchingOptions = contextLengthOptions.filter((option) =>
      !filterText ||
      option.label.toLowerCase().includes(filterText) ||
      'context length tokens window'.includes(filterText)
    );

    if (matchingOptions.length === 0) return null;

    return (
      <div className="border-b border-zinc-900/80 pb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Context Length</h3>
          <span className="text-[10px] font-bold text-zinc-600">tokens</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {matchingOptions.map((option) => {
            const active = selectedContextMin === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSelectedContextMin((prev) => (prev === option.value ? null : option.value))}
                className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-all ${
                  active
                    ? 'bg-hf-purple/15 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
                }`}
              >
                <span className="text-xs font-bold">{option.label}</span>
                {active ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-hf-purple" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-700 group-hover:border-zinc-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <div className="border-b border-zinc-800/60 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 text-hf-purple">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-zinc-100">Advanced Search</h1>
                <p className="text-sm text-zinc-500">{results.length} {getRepoLabel(repoType).toLowerCase()} repositories</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1">
            {repoTypeItems.map((item) => (
              <button
                key={item.id}
                onClick={() => changeRepoType(item.id)}
                className={`h-10 rounded-xl px-3 text-xs font-black transition-all flex items-center gap-2 ${
                  repoType === item.id
                    ? 'bg-hf-purple text-white shadow-lg shadow-hf-purple/20'
                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
          }}
          className="mt-5 flex flex-wrap items-center gap-3"
        >
          <div className="relative min-w-[260px] flex-[1_1_360px]">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Keyword, model name, repo ID..."
              className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950/45 pl-11 pr-4 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-600 focus:border-hf-purple/60 focus:ring-2 focus:ring-hf-purple/20"
            />
          </div>

          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="Author or org"
            className="h-11 min-w-[160px] flex-[0_1_210px] rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-600 focus:border-hf-purple/60 focus:ring-2 focus:ring-hf-purple/20"
          />

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-11 min-w-[150px] flex-[0_0_170px] rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4 text-sm font-bold text-zinc-300 outline-none transition-all focus:border-hf-purple/60"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={direction}
            onChange={(event) => setDirection(event.target.value as '1' | '-1')}
            className="h-11 min-w-[110px] flex-[0_0_120px] rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4 text-sm font-bold text-zinc-300 outline-none transition-all focus:border-hf-purple/60"
          >
            <option value="-1">Desc</option>
            <option value="1">Asc</option>
          </select>

          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setCurrentPage(1);
            }}
            className="h-11 min-w-[92px] flex-[0_0_100px] rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4 text-sm font-bold text-zinc-300 outline-none transition-all focus:border-hf-purple/60"
          >
            {[25, 50, 100, 200].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="h-11 w-11 rounded-2xl border border-zinc-800 bg-zinc-950/45 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all flex items-center justify-center"
              title="Reset filters"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-11 min-w-[118px] rounded-2xl bg-hf-purple px-5 text-sm font-black text-white shadow-lg shadow-hf-purple/20 transition-all hover:bg-hf-purple/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-zinc-800/60 bg-zinc-950/25 p-4 scrollbar-custom">
          <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-zinc-200">
                <Filter className="h-4 w-4 text-hf-purple" />
                Filters
              </div>
              {tagLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder="Find filter"
                className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 pl-9 pr-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-hf-purple/50"
              />
            </div>
          </div>

          <div className="space-y-4">
            {renderContextLengthSection()}
            {sections.map(renderFilterSection)}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-6 scrollbar-custom">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/60 text-cyan-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-zinc-100 truncate">{getRepoLabel(repoType)} Results</h2>
                <p className="text-xs text-zinc-500">{activeFilterCount} active filters</p>
              </div>
            </div>
            <div className="rounded-full border border-zinc-800 bg-zinc-950/45 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {results.length > 0 ? `${pageStart + 1}-${pageEnd} / ${results.length}` : '0 visible'}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {author.trim() && (
                <button onClick={() => setAuthor('')} className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-hf-purple/50">
                  Author: {author.trim()}
                  <X className="h-3 w-3" />
                </button>
              )}
              {selectedTask && (
                <button onClick={() => setSelectedTask('')} className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-hf-purple/50">
                  {tagLookup.get(selectedTask)?.label || selectedTask}
                  <X className="h-3 w-3" />
                </button>
              )}
              {selectedSdk && (
                <button onClick={() => setSelectedSdk('')} className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-hf-purple/50">
                  {tagLookup.get(selectedSdk)?.label || selectedSdk}
                  <X className="h-3 w-3" />
                </button>
              )}
              {repoType === 'model' && selectedContextMin && (
                <button onClick={() => setSelectedContextMin(null)} className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-hf-purple/50">
                  Context: {formatContextLength(selectedContextMin)}+
                  <X className="h-3 w-3" />
                </button>
              )}
              {selectedTags.map((tagId) => (
                <button key={tagId} onClick={() => toggleTag(tagId)} className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-hf-purple/50">
                  {tagLookup.get(tagId)?.label || tagId}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-950/35 p-5">
                  <div className="mb-4 h-5 w-32 rounded-lg bg-zinc-800" />
                  <div className="mb-3 h-6 w-2/3 rounded-lg bg-zinc-800" />
                  <div className="h-4 w-1/2 rounded-lg bg-zinc-900" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/25 text-center">
              <Search className="mb-4 h-12 w-12 text-zinc-700" />
              <p className="text-lg font-black text-zinc-400">No results</p>
              <p className="mt-1 text-sm text-zinc-600">Try a broader keyword or fewer filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                {paginatedResults.map((result, index) => {
                const id = resultId(result);
                const parts = repoParts(id);
                const category = result.pipeline_tag || result.sdk || result.library_name || getRepoLabel(repoType);
                const tags = Array.isArray(result.tags) ? result.tags.filter(Boolean).slice(0, 5) : [];
                const updated = result.lastModified || result.updatedAt || result.createdAt;
                const resultIndex = pageStart + index;

                return (
                  <motion.article
                    key={`${id}-${resultIndex}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.015 }}
                    onClick={() => onSelectRepo(id, repoType)}
                    className="group cursor-pointer overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/30 transition-all hover:border-hf-purple/45 hover:bg-zinc-900/45"
                  >
                    <div className="p-5">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-hf-purple group-hover:border-hf-purple/40">
                            {repoType === 'model' ? <Box className="h-5 w-5" /> : repoType === 'dataset' ? <Database className="h-5 w-5" /> : <Braces className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-hf-purple/20 bg-hf-purple/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-hf-purple">
                                {category}
                              </span>
                              {result.contextLength && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-400">
                                  <Gauge className="h-3 w-3" />
                                  {formatContextLength(result.contextLength)}
                                </span>
                              )}
                              {result.gated && (
                                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-400">
                                  Gated
                                </span>
                              )}
                            </div>
                            <h3 className="truncate text-base font-black text-zinc-100 transition-colors group-hover:text-hf-purple">
                              {parts.name}
                            </h3>
                            <p className="truncate text-xs font-bold text-zinc-500">by {result.author || parts.owner}</p>
                          </div>
                        </div>

                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            window.open(repoUrl(repoType, id), '_blank', 'noopener,noreferrer');
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-500 transition-all hover:border-hf-purple/50 hover:text-zinc-100"
                          title="View on Hugging Face"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>

                      {tags.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span key={tag} className="flex max-w-[180px] items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[10px] font-bold text-zinc-500">
                              <Tag className="h-3 w-3 shrink-0" />
                              <span className="truncate">{tag}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-3 py-2">
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-600">
                            <Download className="h-3 w-3 text-cyan-400" />
                            Downloads
                          </div>
                          <div className="text-sm font-black text-zinc-200">{compactNumber(result.downloads || result.downloadsAllTime)}</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-3 py-2">
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-600">
                            <Heart className="h-3 w-3 text-red-400" />
                            Likes
                          </div>
                          <div className="text-sm font-black text-zinc-200">{compactNumber(result.likes)}</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 px-3 py-2">
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-600">
                            <Clock3 className="h-3 w-3 text-zinc-500" />
                            Updated
                          </div>
                          <div className="truncate text-sm font-black text-zinc-200">
                            {updated ? new Date(updated).toLocaleDateString() : 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/35 px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Page {activePage} of {totalPages}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={activePage === 1}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-500 transition-all hover:border-hf-purple/50 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 min-w-9 rounded-xl px-3 text-xs font-black transition-all ${
                          activePage === page
                            ? 'bg-hf-purple text-white shadow-lg shadow-hf-purple/20'
                            : 'border border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:border-hf-purple/50 hover:text-zinc-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={activePage === totalPages}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-500 transition-all hover:border-hf-purple/50 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
