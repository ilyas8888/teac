import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Users, GraduationCap, X } from 'lucide-react';
import api from '../services/api';
import type { Class, UserSettings } from '../types';

const empty = { nom: '', niveau: '', groupe: '', etablissement: '', annee: '' };

export default function ClassesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [form, setForm] = useState(empty);

  const { data: classes = [], isLoading } = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/classes', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); closeForm(); },
  });

  const update = useMutation({
    mutationFn: (data: typeof form) => api.put(`/classes/${editing!.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); closeForm(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setShowForm(true);
  }

  function openEdit(cls: Class) {
    setEditing(cls);
    setForm({ nom: cls.nom, niveau: cls.niveau, groupe: cls.groupe || '', etablissement: cls.etablissement || '', annee: cls.annee });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(empty);
  }

  function submit() {
    if (!form.nom || !form.niveau || !form.annee) return;
    editing ? update.mutate(form) : create.mutate(form);
  }

  const isPending = create.isPending || update.isPending;
  const niveaux = settings?.niveauxOptions ?? [];
  const groupes = settings?.groupesOptions ?? [];
  const etablissements = settings?.etablissementsOptions ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500 mt-1">{classes.length} classe{classes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors">
          <Plus size={16} /> Nouvelle classe
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{editing ? 'Modifier la classe' : 'Nouvelle classe'}</h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la classe *</label>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="ex: TSI 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année scolaire *</label>
              <input value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })}
                placeholder="ex: 2025-2026"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau *</label>
              <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Choisir un niveau —</option>
                {niveaux.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Groupe</label>
              <select value={form.groupe} onChange={(e) => setForm({ ...form, groupe: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Choisir un groupe —</option>
                {groupes.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Établissement</label>
              <select value={form.etablissement} onChange={(e) => setForm({ ...form, etablissement: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Choisir un établissement —</option>
                {etablissements.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={submit} disabled={!form.nom || !form.niveau || !form.annee || isPending}
              className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
              {isPending ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
            </button>
            <button onClick={closeForm}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <GraduationCap size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Aucune classe pour l'instant.</p>
          <button onClick={openCreate} className="mt-4 text-indigo-600 text-sm font-medium hover:underline">
            Créer votre première classe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <GraduationCap size={20} className="text-indigo-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(cls)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => { if (window.confirm(`Supprimer "${cls.nom}" ?`)) remove.mutate(cls.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{cls.nom}</h3>
              <p className="text-sm text-gray-600">{cls.niveau}</p>
              {cls.groupe && <p className="text-xs text-indigo-600 font-medium mt-0.5">{cls.groupe}</p>}
              {cls.etablissement && <p className="text-xs text-gray-400 mt-0.5">{cls.etablissement}</p>}
              <p className="text-xs text-gray-400 mt-1">{cls.annee}</p>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-sm text-gray-600">
                <Users size={14} />
                <span>{cls._count?.students ?? 0} élève{(cls._count?.students ?? 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
