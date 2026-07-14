import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../store/AuthContext';

type Step = 'idle' | 'setup' | 'recovery';

export default function TwoFactorSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('idle');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recovery, setRecovery] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const enabled = user?.twoFactorEnabled === true;

  const startSetup = async () => {
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setQr(res.data.qr);
      setSecret(res.data.secret);
      setStep('setup');
    } catch {
      setError("Impossible de démarrer la configuration.");
    } finally { setLoading(false); }
  };

  const confirmEnable = async () => {
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/2fa/enable', { code: code.trim() });
      setRecovery(res.data.recoveryCodes || []);
      setStep('recovery');
      setCode('');
      qc.invalidateQueries({ queryKey: ['settings'] });
      // Refresh the cached auth user so the flag flips in the UI.
      await api.get('/auth/profile').catch(() => {});
    } catch (err: any) {
      setError(err.response?.data?.message || 'Code incorrect.');
    } finally { setLoading(false); }
  };

  const disable = async () => {
    setError(''); setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { password });
      setPassword('');
      setStep('idle');
      qc.invalidateQueries({ queryKey: ['settings'] });
      await api.get('/auth/profile').catch(() => {});
      // Force a reload so useAuth picks up the disabled state.
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mot de passe incorrect.');
    } finally { setLoading(false); }
  };

  const copyRecovery = () => {
    navigator.clipboard.writeText(recovery.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {enabled ? <ShieldCheck size={18} className="text-emerald-600" /> : <ShieldOff size={18} className="text-gray-400" />}
        <h3 className="font-semibold text-gray-900">Double authentification (2FA)</h3>
        {enabled && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Activée</span>}
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Ajoutez une couche de sécurité avec une application d'authentification (Google Authenticator, Authy…).
      </p>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {/* Recovery codes shown once, right after enabling */}
      {step === 'recovery' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Conservez ces codes de secours en lieu sûr. Chacun ne fonctionne qu'une fois.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-800">
            {recovery.map((c) => <span key={c}>{c}</span>)}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={copyRecovery} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copié' : 'Copier'}
            </button>
            <button type="button" onClick={() => setStep('idle')} className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">
              J'ai sauvegardé mes codes
            </button>
          </div>
        </div>
      )}

      {/* QR + code entry during setup */}
      {step === 'setup' && (
        <div className="space-y-4">
          {qr && <img src={qr} alt="QR code 2FA" className="h-44 w-44 rounded-lg border border-gray-200" />}
          <p className="text-xs text-gray-500">
            Ou saisissez la clé manuellement : <span className="font-mono">{secret}</span>
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Code à 6 chiffres</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={confirmEnable} disabled={loading || code.trim().length < 6} className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50">
              {loading ? 'Vérification...' : 'Activer'}
            </button>
            <button type="button" onClick={() => { setStep('idle'); setError(''); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Default state: enable button or disable form */}
      {step === 'idle' && (
        enabled ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Désactiver (confirmez avec votre mot de passe)</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button type="button" onClick={disable} disabled={loading || !password} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                Désactiver
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={startSetup} disabled={loading} className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50">
            {loading ? 'Chargement...' : 'Activer la 2FA'}
          </button>
        )
      )}
    </div>
  );
}
