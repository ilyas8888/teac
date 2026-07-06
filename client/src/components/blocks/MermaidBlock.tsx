import { useEffect, useId, useMemo, useState } from 'react';
import mermaid from 'mermaid';
import { createReactBlockSpec } from '@blocknote/react';

export const DEFAULT_MERMAID_CODE = `graph TD;
  A[Début] --> B{Condition};
  B -->|Oui| C[Action];
  B -->|Non| D[Fin];`;

let mermaidInitialized = false;

function ensureMermaidInitialized() {
  if (mermaidInitialized) return;

  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
  });
  mermaidInitialized = true;
}

function sanitizeSvgId(id: string) {
  return `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/**
 * Mermaid can leave an orphan measuring node (#d<id> or #<id>) in the DOM when
 * render() throws on invalid syntax. Remove it so failed edits don't pile up.
 */
function cleanupMermaidOrphans(renderId: string) {
  document.getElementById(`d${renderId}`)?.remove();
  document.getElementById(renderId)?.remove();
}

export const MermaidBlock = createReactBlockSpec(
  {
    type: 'mermaid',
    propSchema: {
      code: {
        default: DEFAULT_MERMAID_CODE,
      },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const reactId = useId();
      const renderId = useMemo(
        () => sanitizeSvgId(`${reactId}-${block.id}`),
        [block.id, reactId],
      );
      const [svg, setSvg] = useState('');
      const [hasError, setHasError] = useState(false);
      const code = block.props.code || DEFAULT_MERMAID_CODE;
      const isEditable = editor.isEditable;

      useEffect(() => {
        let cancelled = false;
        const timeout = window.setTimeout(() => {
          ensureMermaidInitialized();
          void mermaid
            .render(renderId, code)
            .then(({ svg: renderedSvg }) => {
              if (cancelled) return;
              setSvg(renderedSvg);
              setHasError(false);
            })
            .catch(() => {
              cleanupMermaidOrphans(renderId);
              if (cancelled) return;
              setSvg('');
              setHasError(true);
            });
        }, isEditable ? 500 : 0);

        return () => {
          cancelled = true;
          window.clearTimeout(timeout);
          cleanupMermaidOrphans(renderId);
        };
      }, [code, isEditable, renderId]);

      return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {isEditable && (
            <textarea
              className="mb-4 min-h-32 w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm leading-6 text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              contentEditable={false}
              value={code}
              spellCheck={false}
              onChange={(event) =>
                editor.updateBlock(block, {
                  props: { code: event.currentTarget.value },
                })
              }
              onKeyDown={(event) => event.stopPropagation()}
            />
          )}

          <div
            className={`flex min-h-24 items-center justify-center overflow-x-auto rounded-lg border p-4 ${
              hasError
                ? 'border-red-200 bg-red-50 text-sm text-red-600'
                : 'border-gray-100 bg-gray-50'
            }`}
            contentEditable={false}
          >
            {hasError ? (
              <span>Erreur de syntaxe Mermaid</span>
            ) : (
              <div
                className="max-w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
          </div>
        </div>
      );
    },
  },
)();
