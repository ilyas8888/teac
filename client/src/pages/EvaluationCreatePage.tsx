import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Course, Evaluation, EvalExercice, EvalQuestion, EvaluationContent, QuestionType } from '../types';

interface EvaluationForm {
  titre: string;
  bareme: string;
  date: string;
  courseIds: string[];
}

const emptyForm: EvaluationForm = { titre: '', bareme: '20', date: '', courseIds: [] };
const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function toDatetimeLocal(iso: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function makeQuestion(type: QuestionType): EvalQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    texte: '',
    points: type === 'image' ? 0 : 1,
    ...(type === 'qcm' ? { options: ['', '', '', ''] } : {}),
    ...(type === 'image' ? { imageUrl: '', imageCaption: '' } : {}),
  };
}

const TYPE_LABEL: Record<QuestionType, string> = { open: 'Texte', qcm: 'QCM', image: 'Image' };
const TYPE_COLOR: Record<QuestionType, string> = {
  open: 'bg-blue-50 text-blue-600',
  qcm: 'bg-purple-50 text-purple-600',
  image: 'bg-emerald-50 text-emerald-600',
};

export default function EvaluationCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<EvaluationForm>(emptyForm);
  const [exercices, setExercices] = useState<EvalExercice[]>([]);

  const { data: evaluation, isLoading: evaluationLoading } = useQuery<Evaluation>({
    queryKey: ['evaluation', id],
    queryFn: () => api.get(`/evaluations/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get('/courses').then((r) => r.data),
  });

  useEffect(() => {
    if (!evaluation) return;
    setForm({
      titre: evaluation.titre,
      bareme: String(evaluation.bareme),
      date: toDatetimeLocal(evaluation.date),
      courseIds: evaluation.courses.map((item) => item.courseId),
    });
    const content = evaluation.content as EvaluationContent | null;
    if (content?.exercices) setExercices(content.exercices);
  }, [evaluation]);

  // --- Exercice helpers ---
  function addExercice() {
    setExercices((prev) => [...prev, { id: crypto.randomUUID(), titre: '', enonce: '', questions: [] }]);
  }
  function removeExercice(exId: string) {
    setExercices((prev) => prev.filter((ex) => ex.id !== exId));
  }
  function updateExercice(exId: string, patch: Partial<EvalExercice>) {
    setExercices((prev) => prev.map((ex) => ex.id === exId ? { ...ex, ...patch } : ex));
  }
  function moveExercice(index: number, dir: 'up' | 'down') {
    const list = [...exercices];
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= list.length) return;
    [list[index], list[swap]] = [list[swap], list[index]];
    setExercices(list);
  }

  // --- Question helpers ---
  function addQuestion(exId: string, type: QuestionType) {
    setExercices((prev) => prev.map((ex) =>
      ex.id === exId ? { ...ex, questions: [...ex.questions, makeQuestion(type)] } : ex
    ));
  }
  function removeQuestion(exId: string, qId: string) {
    setExercices((prev) => prev.map((ex) =>
      ex.id === exId ? { ...ex, questions: ex.questions.filter((q) => q.id !== qId) } : ex
    ));
  }
  function updateQuestion(exId: string, qId: string, patch: Partial<EvalQuestion>) {
    setExercices((prev) => prev.map((ex) =>
      ex.id === exId
        ? { ...ex, questions: ex.questions.map((q) => q.id === qId ? { ...q, ...patch } : q) }
        : ex
    ));
  }
  function updateOption(exId: string, qId: string, optIdx: number, value: string) {
    setExercices((prev) => prev.map((ex) =>
      ex.id === exId
        ? { ...ex, questions: ex.questions.map((q) =>
            q.id === qId
              ? { ...q, options: (q.options ?? ['', '', '', '']).map((o, i) => i === optIdx ? value : o) }
              : q
          )}
        : ex
    ));
  }

  const totalPoints = exercices.reduce(
    (sum, ex) => sum + ex.questions.reduce((s, q) => s + q.points, 0), 0
  );
  const baremeOk = totalPoints === Number(form.bareme);

  const buildPayload = () => ({
    titre: form.titre.trim(),
    bareme: Number(form.bareme),
    date: form.date,
    content: { exercices } satisfies EvaluationContent,
    courseIds: form.courseIds,
  });

  const createEvaluation = useMutation({
    mutationFn: () => api.post('/evaluations', buildPayload()),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      navigate(`/evaluations/${res.data.id}`);
    },
  });
  const updateEvaluation = useMutation({
    mutationFn: () => api.put(`/evaluations/${id}`, buildPayload()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      await queryClient.invalidateQueries({ queryKey: ['evaluation', id] });
      navigate(`/evaluations/${id}`);
    },
  });

  const isSaving = createEvaluation.isPending || updateEvaluation.isPending;
  const canSubmit = form.titre.trim().length > 0 && Number(form.bareme) > 0 && form.date.length > 0 && !isSaving;
  const selectedCourses = courses.filter((c) => form.courseIds.includes(c.id));

  function update<K extends keyof EvaluationForm>(key: K, value: EvaluationForm[K]) {
    setForm((cur) => ({ ...cur, [key]: value }));
  }
  function toggleCourse(courseId: string) {
    setForm((cur) => ({
      ...cur,
      courseIds: cur.courseIds.includes(courseId)
        ? cur.courseIds.filter((cid) => cid !== courseId)
        : [...cur.courseIds, courseId],
    }));
  }
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    if (isEdit) updateEvaluation.mutate();
    else createEvaluation.mutate();
  }

  if (evaluationLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <button type="button" onClick={() => navigate(isEdit && id ? `/evaluations/${id}` : '/evaluations')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <ArrowLeft size={16} /> Annuler
          </button>
          <button type="submit" form="evaluation-form" disabled={!canSubmit}
            className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <form id="evaluation-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Modifier le contrôle' : 'Nouveau contrôle'}</h1>
            <p className="mt-1 text-sm text-gray-500">Renseignez les informations et rédigez les exercices.</p>
          </div>

          <Section title="Informations">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Titre" required>
                <input value={form.titre} onChange={(e) => update('titre', e.target.value)} required autoFocus className={inputClass} placeholder="Ex: Contrôle chapitre 3" />
              </Field>
              <Field label="Barème" required>
                <input value={form.bareme} onChange={(e) => update('bareme', e.target.value)} type="number" min="1" step="0.5" required className={inputClass} />
              </Field>
              <Field label="Date" required>
                <input value={form.date} onChange={(e) => update('date', e.target.value)} type="datetime-local" required className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section title="Cours">
            {coursesLoading ? (
              <div className="py-4 text-sm text-gray-400">Chargement...</div>
            ) : courses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-400">Aucun cours disponible.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {courses.map((course) => (
                  <label key={course.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm hover:border-indigo-200 hover:bg-indigo-50/40">
                    <input type="checkbox" checked={form.courseIds.includes(course.id)} onChange={() => toggleCourse(course.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-700 focus:ring-indigo-500" />
                    <span>
                      <span className="block font-medium text-gray-900">{course.nom}</span>
                      <span className="text-xs text-gray-500">{course.matiere}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </Section>

          <Section title="Exercices">
            {/* Indicateur barème */}
            {exercices.length > 0 && (
              <div className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm ${baremeOk ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                <span>Total : <strong>{totalPoints} pts</strong></span>
                <span className="text-gray-300">—</span>
                <span>Barème : <strong>{form.bareme} pts</strong></span>
                {baremeOk ? <span className="font-semibold">✓</span> : <span>⚠ écart de {Math.abs(Number(form.bareme) - totalPoints)} pts</span>}
              </div>
            )}

            <div className="space-y-4">
              {exercices.map((ex, exIdx) => (
                <div key={ex.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {/* Header exercice */}
                  <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2">
                    <span className="shrink-0 text-xs font-semibold uppercase text-gray-400">Exercice {exIdx + 1}</span>
                    <input value={ex.titre} onChange={(e) => updateExercice(ex.id, { titre: e.target.value })}
                      placeholder="Titre (optionnel)"
                      className="flex-1 bg-transparent text-sm font-semibold text-gray-800 placeholder-gray-300 outline-none" />
                    <span className="shrink-0 text-xs font-medium text-gray-400">
                      {ex.questions.reduce((s, q) => s + q.points, 0)} pts
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => moveExercice(exIdx, 'up')} disabled={exIdx === 0}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveExercice(exIdx, 'down')} disabled={exIdx === exercices.length - 1}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => removeExercice(ex.id)}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">×</button>
                    </div>
                  </div>

                  {/* Énoncé */}
                  <div className="px-4 pt-3 pb-2">
                    <textarea value={ex.enonce} onChange={(e) => updateExercice(ex.id, { enonce: e.target.value })}
                      placeholder="Énoncé, contexte, données…" rows={3}
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
                  </div>

                  {/* Questions */}
                  <div className="space-y-3 px-4 pb-3">
                    {ex.questions.map((q, qIdx) => {
                      const qType = q.type ?? 'open';
                      return (
                        <div key={q.id} className="flex items-start gap-2">
                          <span className="mt-2 w-8 shrink-0 text-xs font-medium text-gray-400">Q{exIdx + 1}.{qIdx + 1}</span>
                          <div className="flex-1 space-y-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[qType]}`}>
                              {TYPE_LABEL[qType]}
                            </span>
                            <textarea value={q.texte}
                              onChange={(e) => updateQuestion(ex.id, q.id, { texte: e.target.value })}
                              placeholder={qType === 'image' ? 'Légende / consigne liée à l\'image…' : 'Texte de la question…'}
                              rows={2}
                              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />

                            {/* QCM options */}
                            {qType === 'qcm' && (
                              <div className="space-y-1.5 pl-1">
                                {(q.options ?? ['', '', '', '']).map((opt, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <button type="button" onClick={() => updateQuestion(ex.id, q.id, { optionCorrecte: i })}
                                      title="Bonne réponse"
                                      className={`h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${q.optionCorrecte === i ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`} />
                                    <span className="w-4 shrink-0 text-xs font-bold text-gray-400">{String.fromCharCode(65 + i)}</span>
                                    <input value={opt} onChange={(e) => updateOption(ex.id, q.id, i, e.target.value)}
                                      placeholder={`Option ${String.fromCharCode(65 + i)}…`}
                                      className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-indigo-300" />
                                  </div>
                                ))}
                                {q.optionCorrecte !== undefined && (
                                  <p className="pl-6 text-xs text-green-600">Bonne réponse : {String.fromCharCode(65 + q.optionCorrecte)}</p>
                                )}
                              </div>
                            )}

                            {/* Image URL */}
                            {qType === 'image' && (
                              <div className="space-y-2">
                                <input value={q.imageUrl ?? ''} onChange={(e) => updateQuestion(ex.id, q.id, { imageUrl: e.target.value })}
                                  placeholder="URL de l'image (https://…)"
                                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-300" />
                                {q.imageUrl && (
                                  <img src={q.imageUrl} alt="aperçu"
                                    className="max-h-40 rounded border border-gray-200 object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Points + remove */}
                          <div className="mt-1 flex shrink-0 items-center gap-1">
                            {qType !== 'image' && (
                              <>
                                <input type="number" value={q.points}
                                  onChange={(e) => updateQuestion(ex.id, q.id, { points: Math.max(0, Number(e.target.value)) })}
                                  min="0" step="0.5"
                                  className="w-14 rounded border border-gray-200 px-2 py-1 text-center text-sm outline-none focus:border-indigo-300" />
                                <span className="text-xs text-gray-400">pts</span>
                              </>
                            )}
                            <button type="button" onClick={() => removeQuestion(ex.id, q.id)}
                              className="ml-1 rounded p-1 text-gray-300 hover:text-red-400">×</button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Boutons ajouter question */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-gray-400">+ Ajouter :</span>
                      {(['open', 'qcm', 'image'] as QuestionType[]).map((t) => (
                        <button key={t} type="button" onClick={() => addQuestion(ex.id, t)}
                          className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${TYPE_COLOR[t]} border-current/20 hover:opacity-80`}>
                          {TYPE_LABEL[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addExercice}
              className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600">
              + Ajouter un exercice
            </button>
          </Section>
        </form>

        <aside className="w-full lg:w-80">
          <div className="sticky top-24">
            <EvaluationPreview form={form} courses={selectedCourses} exercices={exercices} totalPoints={totalPoints} baremeOk={baremeOk} />
          </div>
        </aside>
      </main>
    </div>
  );
}

function EvaluationPreview({ form, courses, exercices, totalPoints, baremeOk }: {
  form: EvaluationForm; courses: Course[]; exercices: EvalExercice[]; totalPoints: number; baremeOk: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-2 bg-indigo-900" />
      <div className="p-5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <ClipboardList size={22} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{form.titre || 'Titre du contrôle'}</h2>
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-sm">
          <PreviewLine label="Barème" value={form.bareme ? `${form.bareme} pts` : 'Non précisé'} />
          <PreviewLine label="Date" value={form.date ? new Date(form.date).toLocaleString('fr-FR') : 'Non planifiée'} />
        </div>
        {courses.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Cours</div>
            <div className="flex flex-wrap gap-2">
              {courses.map((c) => (
                <span key={c.id} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{c.nom}</span>
              ))}
            </div>
          </div>
        )}
        {exercices.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Exercices</div>
            {exercices.map((ex, i) => (
              <div key={ex.id} className="flex justify-between py-0.5 text-xs text-gray-600">
                <span>Ex. {i + 1}{ex.titre ? ` — ${ex.titre}` : ''}</span>
                <span className="text-gray-400">{ex.questions.reduce((s, q) => s + q.points, 0)} pts</span>
              </div>
            ))}
            <div className={`mt-2 text-xs font-semibold ${baremeOk ? 'text-green-600' : 'text-amber-600'}`}>
              Total : {totalPoints} / {form.bareme} pts
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}
