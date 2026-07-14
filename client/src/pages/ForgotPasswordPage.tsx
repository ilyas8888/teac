import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, MailCheck } from 'lucide-react';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/password/forgot', { email });
    } catch {
      // Anti-enumeration: the endpoint always succeeds; ignore transport errors.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-900 p-3 rounded-xl mb-3">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Entrez votre email, nous vous enverrons un lien de réinitialisation.
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <MailCheck size={40} className="mx-auto mb-4 text-emerald-500" />
            <p className="text-sm text-gray-600">
              Si un compte existe pour <span className="font-medium">{email}</span>, un email de réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.
            </p>
          </div>
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-900 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
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
