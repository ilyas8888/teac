import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

export default function LoginPage() {
  const { login, completeTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.twoFactorRequired) {
        setPendingToken(result.pendingToken);
      } else {
        navigate('/');
      }
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handle2fa = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingToken) return;
    setError('');
    setLoading(true);
    try {
      await completeTwoFactor(pendingToken, code);
      navigate('/');
    } catch {
      setError('Code incorrect ou expiré.');
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
          <h1 className="text-2xl font-bold text-gray-900">Teac</h1>
          <p className="text-gray-500 text-sm mt-1">Assistant pédagogique pour enseignants</p>
        </div>

        {pendingToken ? (
          <form onSubmit={handle2fa} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Saisissez le code de votre application d'authentification (ou un code de secours).
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code de vérification</label>
              <input
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="123456"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-900 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Vérification...' : 'Vérifier'}
            </button>
            <button
              type="button"
              onClick={() => { setPendingToken(null); setCode(''); setError(''); }}
              className="w-full text-sm text-gray-500 hover:underline"
            >
              Annuler
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="vous@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-indigo-700 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-900 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-indigo-700 font-medium hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
