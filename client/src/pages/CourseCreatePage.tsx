import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Check, Clock, GraduationCap, Palette } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Course, UserSettings } from '../types';
import ImageUpload from '../components/ImageUpload';

type CourseForm = {
  nom: string;
  matiere: string;
  description: string;
  niveau: string;
  objectifsGeneraux: string;
  prerequis: string;
  nbHeures: string;
  publicCible: string;
  couleur: string;
  image: string;
};

const colorSwatches = ['#4f46e5', '#059669', '#d97706', '#e11d48', '#0284c7', '#7c3aed', '#0f766e', '#c026d3'];
const fallbackNiveaux = ['Débutant', 'Intermédiaire', 'Avancé', 'Technicien', 'Technicien Spécialisé'];
const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

const emptyForm: CourseForm = {
  nom: '',
  matiere: '',
  description: '',
  niveau: '',
  objectifsGeneraux: '',
  prerequis: '',
  nbHeures: '',
  publicCible: '',
  couleur: colorSwatches[0],
  image: '',
};

function toPayload(form: CourseForm) {
  return {
    nom: form.nom.trim(),
    matiere: form.matiere.trim(),
    description: form.description.trim() || null,
    niveau: form.niveau || null,
    objectifsGeneraux: form.objectifsGeneraux.trim() || null,
    prerequis: form.prerequis.trim() || null,
    nbHeures: form.nbHeures ? Number(form.nbHeures) : null,
    publicCible: form.publicCible.trim() || null,
    couleur: form.couleur || null,
    image: form.image || null,
  };
}

export default function CourseCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<CourseForm>(emptyForm);

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ['course', id],
    queryFn: () => api.get(`/courses/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!course) return;
    setForm({
      nom: course.nom,
      matiere: course.matiere,
      description: course.description || '',
      niveau: course.niveau || '',
      objectifsGeneraux: course.objectifsGeneraux || '',
      prerequis: course.prerequis || '',
      nbHeures: course.nbHeures?.toString() || '',
      publicCible: course.publicCible || '',
      couleur: course.couleur || colorSwatches[0],
      image: course.image || '',
    });
  }, [course]);

  const niveaux = useMemo(() => {
    const configured = settings?.niveauxOptions ?? [];
    return Array.from(new Set([...configured, ...fallbackNiveaux])).filter(Boolean);
  }, [settings]);

  const save = useMutation({
    mutationFn: () => {
      const payload = toPayload(form);
      return isEdit ? api.put(`/courses/${id}`, payload) : api.post('/courses', payload);
    },
    onSuccess: async (response) => {
      await qc.invalidateQueries({ queryKey: ['courses'] });
      if (id) await qc.invalidateQueries({ queryKey: ['course', id] });
      const courseId = id || response.data?.id;
      navigate(courseId ? `/courses/${courseId}` : '/courses');
    },
  });

  const canSubmit = Boolean(form.nom.trim() && form.matiere.trim() && !save.isPending);

  function update<K extends keyof CourseForm>(key: K, value: CourseForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (canSubmit) save.mutate();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(isEdit && id ? `/courses/${id}` : '/courses')}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} /> Retour
          </button>
          <button form="course-form" disabled={!canSubmit}
            className="inline-flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
            <Check size={16} /> {save.isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer le cours'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <form id="course-form" onSubmit={submit} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Modifier le cours' : 'Nouveau cours'}</h1>
            <p className="text-sm text-gray-500 mt-1">Renseignez les informations pédagogiques principales du cours.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nom du cours">
              <input value={form.nom} onChange={(e) => update('nom', e.target.value)} autoFocus className={inputClass} placeholder="Ex: JavaScript Avancé" />
            </Field>
            <Field label="Matière">
              <input value={form.matiere} onChange={(e) => update('matiere', e.target.value)} className={inputClass} placeholder="Ex: Développement Web" />
            </Field>
            <Field label="Niveau">
              <select value={form.niveau} onChange={(e) => update('niveau', e.target.value)} className={inputClass}>
                <option value="">Non précisé</option>
                {niveaux.map((niveau) => <option key={niveau} value={niveau}>{niveau}</option>)}
              </select>
            </Field>
            <Field label="Nombre d'heures">
              <input value={form.nbHeures} onChange={(e) => update('nbHeures', e.target.value)} type="number" min="1" className={inputClass} placeholder="Ex: 24" />
            </Field>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Résumé court du cours..." />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Objectifs généraux">
              <textarea value={form.objectifsGeneraux} onChange={(e) => update('objectifsGeneraux', e.target.value)} rows={5} className={`${inputClass} resize-none`} placeholder="Compétences et résultats attendus..." />
            </Field>
            <Field label="Prérequis">
              <textarea value={form.prerequis} onChange={(e) => update('prerequis', e.target.value)} rows={5} className={`${inputClass} resize-none`} placeholder="Connaissances nécessaires avant de commencer..." />
            </Field>
          </div>

          <Field label="Public cible">
            <input value={form.publicCible} onChange={(e) => update('publicCible', e.target.value)} className={inputClass} placeholder="Ex: Stagiaires de première année" />
          </Field>

          <ImageUpload
            label="Image de couverture"
            value={form.image}
            onChange={(url) => update('image', url ?? '')}
            aspectRatio="wide"
          />

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Palette size={15} /> Couleur du cours
            </div>
            <div className="flex flex-wrap gap-2">
              {colorSwatches.map((color) => (
                <button key={color} type="button" onClick={() => update('couleur', color)}
                  className={`h-9 w-9 rounded-full border-2 ${form.couleur === color ? 'border-gray-900' : 'border-white'} shadow-sm`}
                  style={{ backgroundColor: color }}
                  aria-label={`Choisir ${color}`}
                />
              ))}
            </div>
          </div>
        </form>

        <aside className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-fit">
          {form.image ? (
            <div className="relative h-28 w-full overflow-hidden">
              <img src={form.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            </div>
          ) : (
            <div className="h-2" style={{ backgroundColor: form.couleur }} />
          )}
          <div className="p-5">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white mb-4" style={{ backgroundColor: form.couleur }}>
              <BookOpen size={22} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{form.nom || 'Nom du cours'}</h2>
            <p className="text-sm text-gray-500 mt-1">{form.matiere || 'Matière'}</p>
            {form.description && <p className="text-sm text-gray-600 mt-4">{form.description}</p>}
            <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <PreviewMeta icon={<GraduationCap size={15} />} label="Niveau" value={form.niveau || 'Non précisé'} />
              <PreviewMeta icon={<Clock size={15} />} label="Durée" value={form.nbHeures ? `${form.nbHeures} h` : 'Non précisée'} />
            </div>
            {(form.objectifsGeneraux || form.prerequis || form.publicCible) && (
              <div className="mt-5 space-y-3 text-sm">
                {form.objectifsGeneraux && <PreviewText label="Objectifs" value={form.objectifsGeneraux} />}
                {form.prerequis && <PreviewText label="Prérequis" value={form.prerequis} />}
                {form.publicCible && <PreviewText label="Public cible" value={form.publicCible} />}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

function PreviewMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">{icon}<span className="text-xs">{label}</span></div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  );
}

function PreviewText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-medium text-gray-900">{label}</div>
      <p className="text-gray-600 mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
