import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Settings2 } from 'lucide-react';
import api from '../services/api';
import type { UserSettings } from '../types';

type OptionKey = 'niveauxOptions' | 'groupesOptions' | 'etablissementsOptions';

const sections: { key: OptionKey; label: string; placeholder: string }[] = [
  { key: 'niveauxOptions', label: 'Niveaux', placeholder: 'ex: Technicien Spécialisé' },
  { key: 'groupesOptions', label: 'Groupes', placeholder: 'ex: Groupe 5' },
  { key: 'etablissementsOptions', label: 'Établissements', placeholder: 'ex: ISTA Témara' },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [inputs, setInputs] = useState<Record<OptionKey, string>>({
    niveauxOptions: '',
    groupesOptions: '',
    etablissementsOptions: '',
  });

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: Partial<UserSettings>) => api.put('/settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  function addOption(key: OptionKey) {
    const val = inputs[key].trim();
    if (!val || !settings) return;
    const current = settings[key] ?? [];
    if (current.includes(val)) return;
    save.mutate({ [key]: [...current, val] });
    setInputs((prev) => ({ ...prev, [key]: '' }));
  }

  function removeOption(key: OptionKey, value: string) {
    if (!settings) return;
    save.mutate({ [key]: settings[key].filter((v) => v !== value) });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Settings2 size={22} className="text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">Gérez les listes d'options utilisées dans la section Classes.</p>

      <div className="space-y-6">
        {sections.map(({ key, label, placeholder }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">{label}</h2>

            <div className="flex flex-wrap gap-2 mb-4 min-h-[2rem]">
              {(settings?.[key] ?? []).length === 0 ? (
                <span className="text-sm text-gray-400 italic">Aucune option</span>
              ) : (
                (settings?.[key] ?? []).map((val) => (
                  <span key={val}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full font-medium">
                    {val}
                    <button onClick={() => removeOption(key, val)}
                      className="text-indigo-400 hover:text-indigo-700 transition-colors">
                      <X size={13} />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={inputs[key]}
                onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') addOption(key); }}
                placeholder={placeholder}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={() => addOption(key)} disabled={!inputs[key].trim() || save.isPending}
                className="flex items-center gap-1.5 bg-indigo-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                <Plus size={15} /> Ajouter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
