import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, ClipboardList, Pencil, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Evaluation, EvaluationContent } from '../types';

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
        <p className="mb-4">Évaluation introuvable.</p>
        <button onClick={() => navigate('/evaluations')} className="font-medium text-indigo-700 hover:underline">
          Retour aux évaluations
        </button>
      </div>
    );
  }

  const content = evaluation.content as EvaluationContent | null;
  const exercices = content?.exercices ?? [];
  const hasContent = exercices.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{'@media print { .no-print { display: none !important; } body { background: white !important; } .print-lines { display: block !important; } }'}</style>

      <header className="no-print sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate('/evaluations')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
            >
              <Printer size={15} />
              Imprimer / PDF
            </button>
            <Link
              to={`/evaluations/${evaluation.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800"
            >
              <Pencil size={15} />
              Modifier
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Fiche d'identité */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <ClipboardList size={22} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{evaluation.titre}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {format(new Date(evaluation.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </span>
            <span className="font-semibold text-gray-700">/{evaluation.bareme} pts</span>
            <span>{evaluation._count?.grades ?? 0} notes saisies</span>
          </div>
          {evaluation.courses.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {evaluation.courses.map(({ course }) => (
                <span key={course.id} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  {course.nom}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Corps — exercices */}
        {hasContent ? (
          <div className="space-y-6">
            {exercices.map((ex, exIdx) => (
              <div key={ex.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3">
                  <h2 className="font-bold text-gray-800">
                    Exercice {exIdx + 1}{ex.titre ? ` — ${ex.titre}` : ''}
                  </h2>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-semibold text-indigo-700">
                    {ex.questions.reduce((s, q) => s + q.points, 0)} pts
                  </span>
                </div>

                <div className="space-y-5 px-6 py-4">
                  {ex.enonce && (
                    <p className="whitespace-pre-wrap leading-relaxed text-sm text-gray-700">{ex.enonce}</p>
                  )}

                  {ex.questions.length > 0 && (
                    <div className="space-y-5">
                      {ex.questions.map((q, qIdx) => (
                        <div key={q.id}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-1 items-start gap-2">
                              <span className="mt-0.5 shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-bold text-indigo-600">
                                {exIdx + 1}.{qIdx + 1}
                              </span>
                              <p className="leading-relaxed text-sm text-gray-800">{q.texte}</p>
                            </div>
                            <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                              {q.points} pt{q.points > 1 ? 's' : ''}
                            </span>
                          </div>
                          {/* Lignes de réponse — uniquement à l'impression */}
                          <div className="print-lines mt-3 hidden space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="h-px w-full bg-gray-300" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Récapitulatif barème — masqué à l'impression */}
            <div className="no-print rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-600">Récapitulatif barème</h3>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {exercices.map((ex, i) => (
                    <tr key={ex.id}>
                      <td className="py-1.5 text-gray-600">
                        Exercice {i + 1}{ex.titre ? ` — ${ex.titre}` : ''}
                      </td>
                      <td className="py-1.5 text-right font-medium text-gray-800">
                        {ex.questions.reduce((s, q) => s + q.points, 0)} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td className="pt-2 font-bold text-gray-900">Total</td>
                    <td className="pt-2 text-right font-bold text-gray-900">
                      {exercices.reduce((s, ex) => s + ex.questions.reduce((sq, q) => sq + q.points, 0), 0)} pts
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center text-gray-400 shadow-sm">
            <ClipboardList size={44} className="mx-auto mb-3 opacity-30" />
            <p className="mb-4">Aucun exercice rédigé.</p>
            <Link
              to={`/evaluations/${evaluation.id}/edit`}
              className="no-print inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
            >
              Ajouter des exercices
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
