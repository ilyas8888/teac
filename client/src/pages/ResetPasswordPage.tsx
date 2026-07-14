import { useState, type FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { GraduationCap, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/password/reset', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lien invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-900 p-3 rounded-xl mb-3">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
        </div>

        {!token ? (
          <p className="text-center text-sm text-red-600">Lien invalide : aucun jeton fourni.</p>
        ) : done ? (
          <div className="text-center">
            <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-500" />
            <p className="text-sm text-gray-600">Mot de passe réinitialisé. Redirection vers la connexion…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-900 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Réinitialiser'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-indigo-700 font-medium hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
