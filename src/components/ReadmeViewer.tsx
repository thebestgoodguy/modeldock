// Developer / Creator: Sadri ERCAN
import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface ReadmeViewerProps {
  content: string;
}

export const ReadmeViewer = ({ content }: ReadmeViewerProps) => {
  const html = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return '<p>README not found for this repository.</p>';

    const withoutFrontMatter = trimmed.replace(/^---[\s\S]*?---\s*/, '');
    const rendered = marked.parse(withoutFrontMatter, {
      async: false,
      breaks: true,
      gfm: true
    }) as string;

    return DOMPurify.sanitize(rendered, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'rel']
    });
  }, [content]);

  return (
    <article
      className="readme-prose w-full min-h-full bg-zinc-950/30 border border-zinc-800/60 rounded-3xl p-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
