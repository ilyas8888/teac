import { useState, type FormEvent } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { createReactBlockSpec } from '@blocknote/react';
import api from '../../services/api';
import { detectEmbed, type EmbedAspect } from '../../lib/embed';

type LinkCardMode = 'auto' | 'embed' | 'card' | 'compact';

const linkCardModes: { value: LinkCardMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'embed', label: 'Intégré' },
  { value: 'card', label: 'Carte' },
  { value: 'compact', label: 'Compact' },
];

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getEmbedContainerClass(aspect: EmbedAspect) {
  if (aspect === 'video') return 'aspect-video';
  if (aspect === 'wide') return 'h-[450px]';
  return 'h-[500px]';
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
      mode: {
        default: 'auto',
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
      const mode = linkCardModes.some((item) => item.value === block.props.mode)
        ? (block.props.mode as LinkCardMode)
        : 'auto';
      const embed = hasUrl ? detectEmbed(block.props.url) : null;
      const shouldRenderEmbed = mode === 'embed' || (mode === 'auto' && embed);

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
              mode,
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
                    mode,
                  },
                });
              }}
            >
              <Link2 size={14} />
            </button>
          )}

          {isEditable && (
            <div className="flex gap-1 border-b border-gray-100 p-2 pr-10" contentEditable={false}>
              {linkCardModes.map((item) => (
                <button
                  key={item.value}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    mode === item.value
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    editor.updateBlock(block, {
                      props: { mode: item.value },
                    });
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {shouldRenderEmbed ? (
            <div className="overflow-hidden rounded-b-xl" contentEditable={false}>
              {mode === 'embed' && !embed && (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  Certains sites bloquent l'intégration. localhost ne fonctionne que sur votre machine, et une page HTTPS ne peut pas intégrer un lien HTTP. Sinon, utilisez le mode Carte.
                </div>
              )}
              <div className={embed ? getEmbedContainerClass(embed.aspect) : 'h-[500px]'}>
                <iframe
                  className="h-full w-full border-0"
                  src={embed?.embedUrl || block.props.url}
                  title={block.props.title || embed?.provider || domain || 'Embed'}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                  allow="fullscreen; picture-in-picture; clipboard-write"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
          ) : mode === 'compact' ? (
            <a
              className="inline-flex max-w-full items-center gap-2 rounded-full px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 hover:text-indigo-600"
              href={block.props.url}
              target="_blank"
              rel="noreferrer"
              contentEditable={false}
            >
              {block.props.favicon ? (
                <img className="h-4 w-4 shrink-0 rounded" src={block.props.favicon} alt="" />
              ) : (
                <Link2 className="shrink-0 text-gray-400" size={16} />
              )}
              <span className="truncate">{block.props.title || domain}</span>
              <ExternalLink className="shrink-0 text-gray-400" size={14} />
            </a>
          ) : (
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
          )}
        </div>
      );
    },
  },
)();
