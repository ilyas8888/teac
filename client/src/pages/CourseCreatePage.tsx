import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Course } from '../types';

const NIVEAUX = ['College', 'Lycee', 'BTS', 'BUT', 'Licence', 'Master', 'Autre'];
const MATIERES = ['Mathematiques', 'Physique-Chimie', 'Informatique', 'Histoire-Geographie', 'Francais', 'Anglais', 'SVT', 'Philosophie', 'Economie', 'Autre'];
const COLOR_SWATCHES = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

interface CourseForm {
  nom: string;
  matiere: string;
  niveau: string;
  couleur: string;
  description: string;
  objectifsGeneraux: string;
  prerequis: string;
  nbHeures: string;
  publicCible: string;
}

const emptyForm: CourseForm = {
  nom: '',
  matiere: '',
  niveau: '',
  couleur: COLOR_SWATCHES[0],
  description: '',
  objectifsGeneraux: '',
  prerequis: '',
  nbHeures: '',
  publicCible: '',
};

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

function toPayload(form: CourseForm) {
  return {
    nom: form.nom.trim(),
    matiere: form.matiere.trim(),
    niveau: form.niveau || null,
    couleur: form.couleur || null,
    description: form.description.trim() || null,
    objectifsGeneraux: form.objectifsGeneraux.trim() || null,
    prerequis: form.prerequis.trim() || null,
    nbHeures: form.nbHeures ? Number(form.nbHeures) : null,
    publicCible: form.publicCible.trim() || null,
  };
}

function fromCourse(course: Course): CourseForm {
  return {
    nom: course.nom,
    matiere: course.matiere,
    niveau: course.niveau || '',
    couleur: course.couleur || COLOR_SWATCHES[0],
    description: course.description || '',
    objectifsGeneraux: course.objectifsGeneraux || '',
    prerequis: course.prerequis || '',
    nbHeures: course.nbHeures?.toString() || '',
    publicCible: course.publicCible || '',
  };
}

function CoursePreviewCard({ form }: { form: CourseForm }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-2" style={{ backgroundColor: form.couleur }} />
      <div className="p-5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ backgroundColor: form.couleur }}>
          <BookOpen size={22} />
        </div>

        <h2 className="text-xl font-bold text-gray-900">{form.nom || 'Nom du cours'}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ color: form.couleur, backgroundColor: `${form.couleur}1A` }}>
            {form.matiere || 'Matiere'}
          </span>
          {form.niveau && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{form.niveau}</span>}
        </div>

        {form.description && <p className="mt-4 whitespace-pre-wrap text-sm text-gray-600">{form.description}</p>}

        <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-sm">
          <PreviewLine label="Duree" value={form.nbHeures ? `${form.nbHeures} h` : 'Non precisee'} />
          <PreviewLine label="Public cible" value={form.publicCible || 'Non precise'} />
          {form.objectifsGeneraux && <PreviewText label="Objectifs generaux" value={form.objectifsGeneraux} />}
          {form.prerequis && <PreviewText label="Prerequis" value={form.prerequis} />}
        </div>
      </div>
    </div>
  );
}

export default function CourseCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<CourseForm>(emptyForm);

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ['course', id],
    queryFn: () => api.get(`/courses/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (course) setForm(fromCourse(course));
  }, [course]);

  const createCourse = useMutation({
    mutationFn: () => api.post('/courses', toPayload(form)),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      navigate(`/courses/${response.data.id}`);
    },
  });

  const updateCourse = useMutation({
    mutationFn: () => api.put(`/courses/${id}`, toPayload(form)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['course', id] });
      navigate(`/courses/${id}`);
    },
  });

  const isSaving = createCourse.isPending || updateCourse.isPending;
  const canSubmit = form.nom.trim().length > 0 && form.matiere.trim().length > 0 && !isSaving;

  function update<K extends keyof CourseForm>(key: K, value: CourseForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    if (isEdit) updateCourse.mutate();
    else createCourse.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <button
            type="button"
            onClick={() => navigate(isEdit && id ? `/courses/${id}` : '/courses')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Annuler
          </button>
          <button
            type="submit"
            form="course-form"
            disabled={!canSubmit}
            className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Creer'}
          </button>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <form id="course-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Modifier le cours' : 'Nouveau cours'}</h1>
            <p className="mt-1 text-sm text-gray-500">Renseignez les informations principales du cours.</p>
          </div>

          <Section title="Identite">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nom" required>
                <input
                  value={form.nom}
                  onChange={(event) => update('nom', event.target.value)}
                  required
                  autoFocus
                  className={inputClass}
                  placeholder="Ex: Algorithmique"
                />
              </Field>
              <Field label="Matiere" required>
                <input
                  value={form.matiere}
                  onChange={(event) => update('matiere', event.target.value)}
                  required
                  list="matieres"
                  className={inputClass}
                  placeholder="Ex: Informatique"
                />
                <datalist id="matieres">
                  {MATIERES.map((matiere) => <option key={matiere} value={matiere} />)}
                </datalist>
              </Field>
              <Field label="Niveau">
                <select value={form.niveau} onChange={(event) => update('niveau', event.target.value)} className={inputClass}>
                  <option value="">Non precise</option>
                  {NIVEAUX.map((niveau) => <option key={niveau} value={niveau}>{niveau}</option>)}
                </select>
              </Field>
              <Field label="Couleur">
                <div className="flex flex-wrap gap-2">
                  {COLOR_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => update('couleur', color)}
                      className={`h-9 w-9 rounded-full border-2 shadow-sm ${form.couleur === color ? 'border-gray-900' : 'border-white'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Choisir la couleur ${color}`}
                    />
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="Resume court du cours..."
              />
            </Field>
          </Section>

          <Section title="Pedagogie">
            <Field label="Objectifs generaux">
              <textarea
                value={form.objectifsGeneraux}
                onChange={(event) => update('objectifsGeneraux', event.target.value)}
                rows={5}
                className={`${inputClass} resize-none`}
                placeholder="Competences et resultats attendus..."
              />
            </Field>
            <Field label="Prerequis">
              <textarea
                value={form.prerequis}
                onChange={(event) => update('prerequis', event.target.value)}
                rows={5}
                className={`${inputClass} resize-none`}
                placeholder="Connaissances necessaires avant de commencer..."
              />
            </Field>
          </Section>

          <Section title="Organisation">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nombre d'heures">
                <input
                  value={form.nbHeures}
                  onChange={(event) => update('nbHeures', event.target.value)}
                  type="number"
                  min="1"
                  className={inputClass}
                  placeholder="Ex: 24"
                />
              </Field>
              <Field label="Public cible">
                <input
                  value={form.publicCible}
                  onChange={(event) => update('publicCible', event.target.value)}
                  className={inputClass}
                  placeholder="Ex: Licence 1"
                />
              </Field>
            </div>
          </Section>
        </form>

        <aside className="w-full lg:w-80">
          <div className="sticky top-24">
            <CoursePreviewCard form={form} />
          </div>
        </aside>
      </main>
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

function PreviewText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-medium text-gray-900">{label}</div>
      <p className="mt-1 whitespace-pre-wrap text-gray-600">{value}</p>
    </div>
  );
}
