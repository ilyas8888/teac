import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardList, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import type { Evaluation, Course } from '../types';

export default function EvaluationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: '', bareme: 20, date: '', courseId: '' });

  const { data: evaluations = [], isLoading } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then((r) => r.data),
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get('/courses').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/evaluations', { ...data, bareme: Number(data.bareme) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); setShowForm(false); setForm({ titre: '', bareme: 20, date: '', courseId: '' }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/evaluations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Évaluations & Notes</h1>
          <p className="text-gray-500 text-sm mt-1">{evaluations.length} évaluations</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800">
          <Plus size={16} /> Nouvelle évaluation
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Nouvelle évaluation</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Contrôle chapitre 3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barème</label>
              <input type="number" value={form.bareme} onChange={(e) => setForm({ ...form, bareme: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cours</label>
              <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Choisir un cours</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => create.mutate(form)} disabled={!form.titre || !form.date || !form.courseId || create.isPending}
              className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
              {create.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Annuler</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucune évaluation créée.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Titre</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Cours</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Date</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">Barème</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">Notes saisies</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {evaluations.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{e.titre}</td>
                  <td className="px-6 py-4 text-gray-600">{e.course?.nom || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{format(new Date(e.date), 'dd MMM yyyy', { locale: fr })}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{e.bareme}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{e._count?.grades || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => remove.mutate(e.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
