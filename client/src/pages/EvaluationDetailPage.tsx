import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import { ArrowLeft, Calendar, ClipboardList, Pencil, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Evaluation } from '../types';
import '@blocknote/mantine/style.css';

function ContentViewer({ content }: { content: unknown[] }) {
  const initialContent = useMemo(() => content, [content]);
  const editor = useCreateBlockNote({ initialContent });

  return <BlockNoteView editor={editor} editable={false} theme="light" />;
}

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: evaluation, isLoading } = useQuery<Evaluation>({
    queryKey: ['evaluation', id],
    queryFn: () => api.get(`/evaluations/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="mb-4">Evaluation introuvable.</p>
        <button onClick={() => navigate('/evaluations')} className="font-medium text-indigo-700 hover:underline">Retour aux evaluations</button>
      </div>
    );
  }

  const hasContent = Array.isArray(evaluation.content) && evaluation.content.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{'@media print { .no-print { display: none !important; } body { background: white !important; } }'}</style>
      <header className="no-print sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/evaluations')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <ArrowLeft size={16} />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900">
              <Printer size={15} />
              Imprimer/PDF
            </button>
            <Link to={`/evaluations/${evaluation.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800">
              <Pencil size={15} />
              Modifier
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <ClipboardList size={22} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{evaluation.titre}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {format(new Date(evaluation.date), 'dd MMMM yyyy a HH:mm', { locale: fr })}</span>
            <span>{evaluation.bareme} pts</span>
            <span>{evaluation._count?.grades ?? 0} notes</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {evaluation.courses.map(({ course }) => (
              <span key={course.id} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{course.nom}</span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 shadow-sm">
          {hasContent ? (
            <ContentViewer content={evaluation.content as unknown[]} />
          ) : (
            <div className="py-16 text-center text-gray-400">
              <ClipboardList size={44} className="mx-auto mb-3 opacity-30" />
              <p className="mb-4">Aucun contenu redige</p>
              <Link to={`/evaluations/${evaluation.id}/edit`} className="no-print inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">
                Ajouter
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
