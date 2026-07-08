import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Eye, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Evaluation } from '../types';

export default function EvaluationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: evaluations = [], isLoading } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/evaluations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations'] }),
  });

  function deleteEvaluation(evaluation: Evaluation) {
    if (!window.confirm(`Supprimer le controle "${evaluation.titre}" ?`)) return;
    remove.mutate(evaluation.id);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluations</h1>
          <p className="mt-1 text-sm text-gray-500">{evaluations.length} controles</p>
        </div>
        <button
          onClick={() => navigate('/evaluations/new')}
          className="flex items-center gap-2 rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
        >
          <Plus size={16} />
          Nouveau controle
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" /></div>
      ) : evaluations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-400">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucun controle cree.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Titre</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Cours</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-6 py-3 text-center font-medium text-gray-600">Bareme</th>
                <th className="px-6 py-3 text-center font-medium text-gray-600">Notes</th>
                <th className="px-6 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {evaluations.map((evaluation) => (
                <tr key={evaluation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{evaluation.titre}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {evaluation.courses.map(({ course }) => course.nom).join(', ') || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{format(new Date(evaluation.date), 'dd MMM yyyy', { locale: fr })}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{evaluation.bareme}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{evaluation._count?.grades ?? 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigate(`/evaluations/${evaluation.id}`)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                        title="Voir"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => deleteEvaluation(evaluation)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
