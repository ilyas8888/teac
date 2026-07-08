import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Course, Evaluation } from '../types';
import '@blocknote/mantine/style.css';

type EvalEditorInstance = ReturnType<typeof useCreateBlockNote>;

interface EvaluationForm {
  titre: string;
  bareme: string;
  date: string;
  courseIds: string[];
}

const emptyForm: EvaluationForm = {
  titre: '',
  bareme: '20',
  date: '',
  courseIds: [],
};

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function toDatetimeLocal(iso: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromEvaluation(evaluation: Evaluation): EvaluationForm {
  return {
    titre: evaluation.titre,
    bareme: String(evaluation.bareme),
    date: toDatetimeLocal(evaluation.date),
    courseIds: evaluation.courses.map((item) => item.courseId),
  };
}

function EvalEditor({ initialContent, onEditorReady }: { initialContent?: unknown; onEditorReady: (editor: EvalEditorInstance) => void }) {
  const editor = useCreateBlockNote({
    initialContent: Array.isArray(initialContent) && initialContent.length > 0 ? initialContent : undefined,
  });

  useEffect(() => {
    onEditorReady(editor);
  }, [editor, onEditorReady]);

  return <BlockNoteView editor={editor} theme="light" />;
}

export default function EvaluationCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<EvaluationForm>(emptyForm);
  const [editorKey, setEditorKey] = useState(0);
  const [editorInstance, setEditorInstance] = useState<EvalEditorInstance | null>(null);

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
    setForm(fromEvaluation(evaluation));
    setEditorKey((current) => current + 1);
  }, [evaluation]);

  const payload = () => ({
    titre: form.titre.trim(),
    bareme: Number(form.bareme),
    date: form.date,
    content: editorInstance?.document,
    courseIds: form.courseIds,
  });

  const createEvaluation = useMutation({
    mutationFn: () => api.post('/evaluations', payload()),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      navigate(`/evaluations/${response.data.id}`);
    },
  });

  const updateEvaluation = useMutation({
    mutationFn: () => api.put(`/evaluations/${id}`, payload()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      await queryClient.invalidateQueries({ queryKey: ['evaluation', id] });
      navigate(`/evaluations/${id}`);
    },
  });

  const isSaving = createEvaluation.isPending || updateEvaluation.isPending;
  const canSubmit = form.titre.trim().length > 0 && Number(form.bareme) > 0 && form.date.length > 0 && form.courseIds.length > 0 && !isSaving;
  const selectedCourses = courses.filter((course) => form.courseIds.includes(course.id));

  function update<K extends keyof EvaluationForm>(key: K, value: EvaluationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCourse(courseId: string) {
    setForm((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((idValue) => idValue !== courseId)
        : [...current.courseIds, courseId],
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    if (isEdit) updateEvaluation.mutate();
    else createEvaluation.mutate();
  }

  if (evaluationLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <button
            type="button"
            onClick={() => navigate(isEdit && id ? `/evaluations/${id}` : '/evaluations')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Annuler
          </button>
          <button
            type="submit"
            form="evaluation-form"
            disabled={!canSubmit}
            className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Creer'}
          </button>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <form id="evaluation-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Modifier le controle' : 'Nouveau controle'}</h1>
            <p className="mt-1 text-sm text-gray-500">Redigez le sujet et associez-le a un ou plusieurs cours.</p>
          </div>

          <Section title="Informations">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Titre" required>
                <input value={form.titre} onChange={(event) => update('titre', event.target.value)} required autoFocus className={inputClass} placeholder="Ex: Controle chapitre 3" />
              </Field>
              <Field label="Bareme" required>
                <input value={form.bareme} onChange={(event) => update('bareme', event.target.value)} type="number" min="1" step="0.5" required className={inputClass} />
              </Field>
              <Field label="Date" required>
                <input value={form.date} onChange={(event) => update('date', event.target.value)} type="datetime-local" required className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section title="Cours">
            {coursesLoading ? (
              <div className="py-4 text-sm text-gray-400">Chargement des cours...</div>
            ) : courses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-400">Aucun cours disponible.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {courses.map((course) => (
                  <label key={course.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm hover:border-indigo-200 hover:bg-indigo-50/40">
                    <input
                      type="checkbox"
                      checked={form.courseIds.includes(course.id)}
                      onChange={() => toggleCourse(course.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-700 focus:ring-indigo-500"
                    />
                    <span>
                      <span className="block font-medium text-gray-900">{course.nom}</span>
                      <span className="text-xs text-gray-500">{course.matiere}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </Section>

          <Section title="Sujet">
            <div className="min-h-[30rem] rounded-lg border border-gray-200 bg-white px-2 py-4">
              <EvalEditor key={editorKey} initialContent={evaluation?.content} onEditorReady={setEditorInstance} />
            </div>
          </Section>
        </form>

        <aside className="w-full lg:w-80">
          <div className="sticky top-24">
            <EvaluationPreview form={form} courses={selectedCourses} />
          </div>
        </aside>
      </main>
    </div>
  );
}

function EvaluationPreview({ form, courses }: { form: EvaluationForm; courses: Course[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-2 bg-indigo-900" />
      <div className="p-5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <ClipboardList size={22} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{form.titre || 'Titre du controle'}</h2>
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-sm">
          <PreviewLine label="Bareme" value={form.bareme ? `${form.bareme} pts` : 'Non precise'} />
          <PreviewLine label="Date" value={form.date ? new Date(form.date).toLocaleString('fr-FR') : 'Non planifiee'} />
        </div>
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Cours</div>
          <div className="flex flex-wrap gap-2">
            {courses.length > 0 ? courses.map((course) => (
              <span key={course.id} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{course.nom}</span>
            )) : <span className="text-sm text-gray-400">Aucun cours selectionne</span>}
          </div>
        </div>
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
