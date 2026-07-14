import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (!token) { setState('error'); setMessage('Lien invalide.'); return; }
    api.post('/auth/verify-email', { token })
      .then(() => { setState('success'); setMessage('Votre adresse email est vérifiée.'); })
      .catch((err) => {
        setState('error');
        setMessage(err.response?.data?.message || 'Lien invalide ou expiré.');
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {state === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-500">Vérification en cours…</p>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h1 className="mb-2 text-lg font-semibold text-gray-900">Email vérifié</h1>
            <p className="mb-6 text-sm text-gray-500">{message}</p>
            <Link to="/" className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700">
              Accéder à Teac
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="mb-2 text-lg font-semibold text-gray-900">Vérification impossible</h1>
            <p className="mb-6 text-sm text-gray-500">{message}</p>
            <Link to="/" className="inline-block rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
              Retour
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
