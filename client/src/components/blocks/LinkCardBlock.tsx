import { useState, type FormEvent } from 'react';
import { Link2 } from 'lucide-react';
import { createReactBlockSpec } from '@blocknote/react';
import api from '../../services/api';

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export const LinkCardBlock = createReactBlockSpec(
  {
    type: 'linkCard',
    propSchema: {
      url: {
        default: '',
      },
      title: {
        default: '',
      },
      description: {
        default: '',
      },
      image: {
        default: '',
      },
      siteName: {
        default: '',
      },
      favicon: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const [urlInput, setUrlInput] = useState(block.props.url || '');
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState('');
      const [imgError, setImgError] = useState(false);
      const isEditable = editor.isEditable;
      const hasUrl = Boolean(block.props.url);
      const domain = hasUrl ? getHostname(block.props.url) : '';

      const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const url = urlInput.trim();

        if (!url) {
          setError('Saisissez une URL.');
          return;
        }

        setIsLoading(true);
        setError('');

        try {
          const { data } = await api.get('/unfurl', { params: { url } });
          editor.updateBlock(block, {
            props: {
              url: data.url,
              title: data.title,
              description: data.description,
              image: data.image,
              siteName: data.siteName,
              favicon: data.favicon,
            },
          });
        } catch {
          setError('Impossible de charger la prévisualisation.');
        } finally {
          setIsLoading(false);
        }
      };

      if (!hasUrl && isEditable) {
        return (
          <form
            className="rounded-xl border border-gray-200 bg-white p-4"
            contentEditable={false}
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                contentEditable={false}
                value={urlInput}
                placeholder="https://example.com"
                onChange={(event) => setUrlInput(event.currentTarget.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
              <button
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Chargement…' : 'Prévisualiser'}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </form>
        );
      }

      return (
        <div className="relative rounded-xl border border-gray-200 bg-white">
          {isEditable && (
            <button
              className="absolute right-2 top-2 z-10 rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
              type="button"
              contentEditable={false}
              aria-label="Changer le lien"
              onClick={(event) => {
                event.stopPropagation();
                setUrlInput('');
                editor.updateBlock(block, {
                  props: {
                    url: '',
                    title: '',
                    description: '',
                    image: '',
                    siteName: '',
                    favicon: '',
                  },
                });
              }}
            >
              <Link2 size={14} />
            </button>
          )}

          <a
            className="flex overflow-hidden rounded-xl transition hover:shadow"
            href={block.props.url}
            target="_blank"
            rel="noreferrer"
            contentEditable={false}
          >
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden bg-gray-50 sm:h-32 sm:w-40">
              {block.props.image && !imgError ? (
                <img
                  className="h-full w-full object-cover"
                  src={block.props.image}
                  alt=""
                  onError={() => setImgError(true)}
                />
              ) : block.props.favicon ? (
                <img
                  className="h-10 w-10 rounded-lg"
                  src={block.props.favicon}
                  alt=""
                />
              ) : (
                <Link2 className="text-gray-300" size={32} />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 pr-10">
              <div className="line-clamp-2 font-medium text-gray-900">
                {block.props.title || domain}
              </div>
              {block.props.description && (
                <div className="line-clamp-2 text-sm text-gray-500">
                  {block.props.description}
                </div>
              )}
              <div className="mt-auto flex min-w-0 items-center gap-2 text-xs text-gray-400">
                {block.props.favicon && (
                  <img
                    className="h-4 w-4 shrink-0 rounded"
                    src={block.props.favicon}
                    alt=""
                  />
                )}
                <span className="truncate">{block.props.siteName || domain}</span>
              </div>
            </div>
          </a>
        </div>
      );
    },
  },
)();
