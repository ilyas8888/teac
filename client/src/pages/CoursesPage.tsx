import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, BookOpen, Layers, ClipboardList, Trash2, Pencil, Search,
  GraduationCap, ArrowRight, X,
} from 'lucide-react';
import api from '../services/api';
import type { Course } from '../types';
import { courseTheme } from '../lib/courseTheme';

const emptyForm = { nom: '', matiere: '', description: '' };

export default function CoursesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get('/courses').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/courses', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); closeForm(); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => api.put(`/courses/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); closeForm(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };
  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({ nom: c.nom, matiere: c.matiere, description: c.description || '' });
    setShowForm(true);
  };
  const submit = () => {
    if (editing) update.mutate({ id: editing.id, data: form });
    else create.mutate(form);
  };

  const matieres = useMemo(
    () => Array.from(new Set(courses.map((c) => c.matiere))).sort(),
    [courses],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      c.nom.toLowerCase().includes(q) || c.matiere.toLowerCase().includes(q),
    );
  }, [courses, search]);

  const totalSessions = courses.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
  const totalEvals = courses.reduce((sum, c) => sum + (c._count?.evaluations || 0), 0);

  const pending = create.isPending || update.isPending;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cours & Séances</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos cours, séances et ressources pédagogiques</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors">
          <Plus size={16} /> Nouveau cours
        </button>
      </div>

      {/* Stats */}
      {courses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<BookOpen size={18} />} value={courses.length} label="Cours" color="bg-indigo-100 text-indigo-700" />
          <StatCard icon={<Layers size={18} />} value={totalSessions} label="Séances" color="bg-emerald-100 text-emerald-700" />
          <StatCard icon={<ClipboardList size={18} />} value={totalEvals} label="Évaluations" color="bg-amber-100 text-amber-700" />
          <StatCard icon={<GraduationCap size={18} />} value={matieres.length} label="Matières" color="bg-rose-100 text-rose-700" />
        </div>
      )}

      {/* Search */}
      {courses.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un cours ou une matière..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p className="mb-4">Aucun cours pour le moment.</p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800">
            <Plus size={16} /> Créer mon premier cours
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun résultat pour « {search} ».</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const theme = courseTheme(c.matiere);
            return (
              <div key={c.id}
                onClick={() => navigate(`/courses/${c.id}`)}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${theme.gradient}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${theme.bg} p-2.5 rounded-lg`}>
                      <BookOpen size={18} className={theme.text} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                        className="text-gray-400 hover:text-indigo-600 p-1 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm(`Supprimer le cours « ${c.nom} » ?`)) remove.mutate(c.id); }}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{c.nom}</h3>
                  <span className={`inline-block text-xs font-medium ${theme.text} ${theme.bg} px-2 py-0.5 rounded-full mb-3`}>
                    {c.matiere}
                  </span>
                  {c.description && <p className="text-xs text-gray-500 line-clamp-2 mb-4">{c.description}</p>}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Layers size={12} /> {c._count?.sessions || 0} séances</span>
                      <span className="flex items-center gap-1"><ClipboardList size={12} /> {c._count?.evaluations || 0} éval.</span>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 text-lg">{editing ? 'Modifier le cours' : 'Nouveau cours'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du cours</label>
                  <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: JavaScript Avancé" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
                  <input value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })}
                    list="matieres-list"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Développement Web" />
                  <datalist id="matieres-list">
                    {matieres.map((m) => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Objectifs généraux, public visé, prérequis..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={submit} disabled={!form.nom || !form.matiere || pending}
                className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
                {pending ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer le cours'}
              </button>
              <button onClick={closeForm}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
      <div>
        <div className="text-xl font-bold text-gray-900 leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
      </div>
    </div>
  );
}
