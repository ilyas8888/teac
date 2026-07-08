import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, ClipboardList, Pencil, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Evaluation, EvaluationContent, EvalExercice, EvalQuestion } from '../types';

function QuestionView({ q, exIdx, qIdx }: { q: EvalQuestion; exIdx: number; qIdx: number }) {
  const type = q.type ?? 'open';

  return (
    <div className="mb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-bold text-indigo-600">
            {exIdx + 1}.{qIdx + 1}
          </span>
          <p className="text-sm leading-relaxed text-gray-800">{q.texte}</p>
        </div>
        {type !== 'image' && q.points > 0 && (
          <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
            {q.points} pt{q.points > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Image */}
      {type === 'image' && q.imageUrl && (
        <div className="ml-7 mt-3">
          <img
            src={q.imageUrl}
            alt={q.texte || 'Figure'}
            className="max-h-72 max-w-full rounded border border-gray-200 object-contain"
          />
        </div>
      )}

      {/* QCM options */}
      {type === 'qcm' && (
        <div className="ml-7 mt-2 space-y-1.5">
          {(q.options ?? []).map((opt, i) =>
            opt ? (
              <div key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-400 text-xs text-gray-400">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Open text: lignes de réponse uniquement à l'impression */}
      {type === 'open' && (
        <div className="print-lines ml-7 mt-3 hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-px w-full bg-gray-300" />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciceView({ ex, exIdx }: { ex: EvalExercice; exIdx: number }) {
  const pts = ex.questions.reduce((s, q) => s + q.points, 0);
  return (
    <div style={{ pageBreakInside: 'avoid' }}>
      {/* Header exercice */}
      <div className="mb-4 flex items-center justify-between border-b-2 border-gray-200 pb-2">
        <h2 className="font-bold text-gray-900">
          Exercice {exIdx + 1}{ex.titre ? ` — ${ex.titre}` : ''}
        </h2>
        {pts > 0 && (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-semibold text-indigo-700">
            {pts} pts
          </span>
        )}
      </div>
      {ex.enonce && (
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{ex.enonce}</p>
      )}
      {ex.questions.map((q, qIdx) => (
        <QuestionView key={q.id} q={q} exIdx={exIdx} qIdx={qIdx} />
      ))}
    </div>
  );
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
  const dateStr = format(new Date(evaluation.date), 'dd/MM/yyyy', { locale: fr });
  const coursesStr = evaluation.courses.map((ec) => ec.course.nom).join(', ');

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @media screen {
          .eval-print-thead { display: none; }
          .print-lines { display: none; }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .eval-print-thead { display: table-header-group !important; }
          .print-lines { display: block !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Header écran */}
      <header className="no-print sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/evaluations')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <ArrowLeft size={16} /> Retour
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900">
              <Printer size={15} /> Imprimer / PDF
            </button>
            <Link to={`/evaluations/${evaluation.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800">
              <Pencil size={15} /> Modifier
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Fiche d'identité — page 1 seulement (pas de répétition, avant la table) */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="no-print mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <ClipboardList size={22} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{evaluation.titre}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {format(new Date(evaluation.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </span>
            <span className="font-semibold text-gray-700">/{evaluation.bareme} pts</span>
            <span className="no-print">{evaluation._count?.grades ?? 0} notes saisies</span>
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

        {/* Table — thead répété automatiquement sur chaque page imprimée */}
        {hasContent ? (
          <table className="w-full border-collapse">
            {/* En-tête compact — caché écran, répété sur toutes les pages imprimées */}
            <thead className="eval-print-thead">
              <tr>
                <td className="border-b-2 border-gray-700 pb-3">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <strong className="text-gray-900">{evaluation.titre}</strong>
                      {coursesStr && <span className="ml-2 text-gray-500">— {coursesStr}</span>}
                    </div>
                    <span className="text-gray-700">{dateStr} — /{evaluation.bareme} pts</span>
                  </div>
                </td>
              </tr>
            </thead>

            <tbody>
              {exercices.map((ex, exIdx) => (
                <tr key={ex.id}>
                  <td className="pt-8 pb-2">
                    <ExerciceView ex={ex} exIdx={exIdx} />
                  </td>
                </tr>
              ))}

              {/* Récapitulatif barème — écran seulement */}
              <tr className="no-print">
                <td className="pt-6">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center text-gray-400 shadow-sm">
            <ClipboardList size={44} className="mx-auto mb-3 opacity-30" />
            <p className="mb-4">Aucun exercice rédigé.</p>
            <Link to={`/evaluations/${evaluation.id}/edit`}
              className="no-print inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">
              Ajouter des exercices
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
