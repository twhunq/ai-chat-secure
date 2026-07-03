import React from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!content) {
    return (
      <div className="flex space-x-1.5 items-center py-2.5">
        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-xs text-zinc-400 italic animate-pulse">Trợ lý AI đang soạn thảo...</span>
      </div>
    );
  }

  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3.5 leading-relaxed text-[15px] text-zinc-300">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          // It's a code block
          const lines = part.split('\n');
          const firstLine = lines[0] || '```';
          const language = firstLine.replace('```', '').trim() || 'code';
          const codeContent = lines.slice(1, -1).join('\n');
          const codeId = `code-${index}`;

          return (
            <div key={index} className="my-4 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 font-mono text-sm shadow-md">
              <div className="flex justify-between items-center px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400 select-none">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">{language}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(codeContent, codeId)}
                  className="flex items-center gap-1 hover:text-zinc-200 transition-colors cursor-pointer py-1 px-2 rounded hover:bg-zinc-800"
                >
                  {copiedId === codeId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-zinc-100 whitespace-pre scrollbar-thin">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        } else {
          // Parse lines for formatting
          const lines = part.split('\n');
          return (
            <div key={index} className="space-y-2">
              {lines.map((line, lineIdx) => {
                const trimmed = line.trim();

                // Headers
                if (trimmed.startsWith('### ')) {
                  return <h3 key={lineIdx} className="text-base font-semibold mt-4 mb-2 text-white">{renderInline(trimmed.slice(4))}</h3>;
                }
                if (trimmed.startsWith('## ')) {
                  return <h2 key={lineIdx} className="text-lg font-bold mt-5 mb-2.5 text-white">{renderInline(trimmed.slice(3))}</h2>;
                }
                if (trimmed.startsWith('# ')) {
                  return <h1 key={lineIdx} className="text-xl font-extrabold mt-6 mb-3 text-white">{renderInline(trimmed.slice(2))}</h1>;
                }

                // Bullet points
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  return (
                    <ul key={lineIdx} className="list-disc pl-5 space-y-1.5 my-1.5 text-zinc-300">
                      <li>{renderInline(trimmed.slice(2))}</li>
                    </ul>
                  );
                }

                // Numbered lists
                const matchNum = trimmed.match(/^(\d+)\.\s(.*)/);
                if (matchNum) {
                  return (
                    <ol key={lineIdx} className="list-decimal pl-5 space-y-1.5 my-1.5 text-zinc-300">
                      <li value={parseInt(matchNum[1], 10)}>{renderInline(matchNum[2])}</li>
                    </ol>
                  );
                }

                // Blockquotes
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote key={lineIdx} className="border-l-4 border-emerald-500 pl-4 py-1.5 my-2 italic text-zinc-400 bg-zinc-900/40 rounded-r">
                      {renderInline(trimmed.slice(2))}
                    </blockquote>
                  );
                }

                // Horizontal line
                if (trimmed === '---') {
                  return <hr key={lineIdx} className="my-4 border-zinc-800" />;
                }

                // Empty line
                if (trimmed === '') {
                  return <div key={lineIdx} className="h-2" />;
                }

                // Default paragraph
                return <p key={lineIdx} className="text-zinc-300 leading-relaxed break-words">{renderInline(line)}</p>;
              })}
            </div>
          );
        }
      })}
    </div>
  );
}

// Inline formatting parser for bold (**) and code (`)
function renderInline(text: string) {
  if (!text) return '';

  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-xs border border-zinc-700/50">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
