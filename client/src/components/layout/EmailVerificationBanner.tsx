import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Hidden until we know the user and only when their email is unverified.
  if (!user || user.emailVerified !== false) return null;

  const resend = async () => {
    setStatus('sending');
    try {
      await api.post('/auth/verify-email/resend');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      <span className="flex items-center gap-2">
        <MailWarning size={16} />
        Votre adresse email n'est pas encore vérifiée.
      </span>
      {status === 'sent' ? (
        <span className="font-medium text-amber-900">Email envoyé, vérifiez votre boîte de réception.</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={status === 'sending'}
          className="font-semibold underline underline-offset-2 transition hover:text-amber-900 disabled:opacity-60"
        >
          {status === 'sending' ? 'Envoi…' : status === 'error' ? 'Réessayer' : 'Renvoyer le lien'}
        </button>
      )}
    </div>
  );
}
