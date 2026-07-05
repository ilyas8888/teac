import { useState } from 'react';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

type GenerationType = 'fiche_cours' | 'exercices' | 'quiz' | 'corrige' | 'bilan';

const types: { value: GenerationType; label: string; desc: string }[] = [
  { value: 'fiche_cours', label: 'Fiche de cours', desc: 'Génère une fiche pédagogique complète' },
  { value: 'exercices', label: 'Exercices différenciés', desc: '3 niveaux (facile, moyen, difficile)' },
  { value: 'quiz', label: 'Quiz / QCM', desc: 'Questions à choix multiples avec corrigé' },
  { value: 'corrige', label: 'Corrigé', desc: 'Corrigé détaillé pour un énoncé' },
  { value: 'bilan', label: 'Bilan de progression', desc: 'Rapport personnalisé pour un élève' },
];

export default function AIAssistantPage() {
  const [selectedType, setSelectedType] = useState<GenerationType>('fiche_cours');
  const [ctx, setCtx] = useState({ titre: '', matiere: '', niveau: '', objectifs: '', nombreQuestions: 5, enonce: '' });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setCtx((prev) => ({ ...prev, [key]: e.target.value }));

  const generate = async () => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await api.post('/ai/generate', { type: selectedType, context: ctx });
      setResult(res.data.content);
    } catch {
      setError('Erreur lors de la génération. Vérifiez que le token HuggingFace est configuré.');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={24} className="text-indigo-600" /> Assistant IA
        </h1>
        <p className="text-gray-500 text-sm mt-1">Générez du contenu pédagogique avec l'intelligence artificielle</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-4">
            <h2 className="font-semibold text-gray-900 mb-4">Type de génération</h2>
            <div className="grid grid-cols-1 gap-2">
              {types.map((t) => (
                <button key={t.value} onClick={() => setSelectedType(t.value)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedType === t.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}>
                  <div className="text-sm font-medium text-gray-900">{t.label}</div>
                  <div className="text-xs text-gray-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Paramètres</h2>
            <div className="space-y-3">
              {selectedType !== 'bilan' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {selectedType === 'corrige' ? 'Titre / Sujet' : 'Titre du cours'}
                    </label>
                    <input value={ctx.titre} onChange={set('titre')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Les boucles en Python" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
                      <input value={ctx.matiere} onChange={set('matiere')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: Informatique" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                      <input value={ctx.niveau} onChange={set('niveau')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: Terminale" />
                    </div>
                  </div>
                </>
              )}

              {selectedType === 'fiche_cours' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs pédagogiques</label>
                  <textarea value={ctx.objectifs} onChange={set('objectifs')} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Comprendre et utiliser les structures de répétition" />
                </div>
              )}

              {selectedType === 'quiz' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de questions</label>
                  <input type="number" min={3} max={20} value={ctx.nombreQuestions}
                    onChange={(e) => setCtx({ ...ctx, nombreQuestions: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}

              {selectedType === 'corrige' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Énoncé</label>
                  <textarea value={ctx.enonce} onChange={set('enonce')} rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Collez l'énoncé ici..." />
                </div>
              )}
            </div>

            <button onClick={generate} disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-900 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Génération en cours...</> : <><Sparkles size={16} /> Générer</>}
            </button>

            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Résultat</h2>
            {result && (
              <button onClick={copy} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-700 transition-colors">
                {copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
              </button>
            )}
          </div>
          <div className="p-6 min-h-96 max-h-[600px] overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 size={32} className="animate-spin mb-3" />
                <p className="text-sm">L'IA génère votre contenu...</p>
              </div>
            ) : result ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                <Sparkles size={48} className="mb-3" />
                <p className="text-sm">Le contenu généré apparaîtra ici</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
