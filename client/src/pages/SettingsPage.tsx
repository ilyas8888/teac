import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Sliders,
  User,
  X,
} from 'lucide-react';
import api from '../services/api';
import type { UserSettings } from '../types';
import TwoFactorSettings from '../components/settings/TwoFactorSettings';

type Section = 'profile' | 'personalization' | 'security' | 'account';
type OptionKey = 'niveauxOptions' | 'groupesOptions' | 'etablissementsOptions';

type ProfileForm = {
  nom: string;
  prenom: string;
  ecole: string;
  matiereInput: string;
};

type PasswordForm = {
  current: string;
  next: string;
  confirm: string;
};

const navItems: { key: Section; label: string; icon: typeof User }[] = [
  { key: 'profile', label: 'Profil', icon: User },
  { key: 'personalization', label: 'Personnalisation', icon: Sliders },
  { key: 'security', label: 'Securite', icon: Lock },
  { key: 'account', label: 'Compte', icon: AlertTriangle },
];

const optionSections: { key: OptionKey; label: string; placeholder: string }[] = [
  { key: 'niveauxOptions', label: 'Niveaux', placeholder: 'ex: Technicien Specialise' },
  { key: 'groupesOptions', label: 'Groupes', placeholder: 'ex: Groupe 5' },
  { key: 'etablissementsOptions', label: 'Etablissements', placeholder: 'ex: ISTA Temara' },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>('profile');
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    nom: '',
    prenom: '',
    ecole: '',
    matiereInput: '',
  });
  const [profileDirty, setProfileDirty] = useState(false);
  const [optionInputs, setOptionInputs] = useState<Record<OptionKey, string>>({
    niveauxOptions: '',
    groupesOptions: '',
    etablissementsOptions: '',
  });
  const [pwForm, setPwForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  useEffect(() => {
    if (!settings || profileDirty) return;
    setProfileForm({
      nom: settings.nom ?? '',
      prenom: settings.prenom ?? '',
      ecole: settings.ecole ?? '',
      matiereInput: '',
    });
  }, [profileDirty, settings]);

  const saveProfile = useMutation({
    mutationFn: (data: Pick<UserSettings, 'nom' | 'prenom' | 'ecole' | 'matieres'>) =>
      api.put('/settings', data),
    onSuccess: () => {
      setProfileDirty(false);
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const saveOption = useMutation({
    mutationFn: (data: Partial<UserSettings>) => api.put('/settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const changePw = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.put('/settings/password', data),
    onSuccess: () => {
      setPwForm({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: 'Mot de passe modifie.' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err.response?.data?.message;
      setPwMsg({ ok: false, text: msg ?? 'Impossible de modifier le mot de passe.' });
    },
  });

  const passwordStrong = pwForm.next.length >= 10 && /[A-Z]/.test(pwForm.next) && /\d/.test(pwForm.next);
  const passwordLevel = passwordStrong ? 'strong' : pwForm.next.length >= 6 ? 'medium' : 'weak';
  const passwordMismatch = pwForm.confirm.length > 0 && pwForm.next !== pwForm.confirm;
  const initials = `${settings?.prenom?.[0] ?? ''}${settings?.nom?.[0] ?? ''}`.toUpperCase() || 'TE';

  function updateProfileForm(key: keyof ProfileForm, value: string) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
    setProfileDirty(true);
  }

  function submitProfile() {
    if (!settings) return;
    saveProfile.mutate({
      nom: profileForm.nom.trim(),
      prenom: profileForm.prenom.trim(),
      ecole: profileForm.ecole.trim(),
      matieres: settings.matieres ?? [],
    });
  }

  function addMatiere() {
    if (!settings) return;
    const val = profileForm.matiereInput.trim();
    const current = settings.matieres ?? [];
    if (!val || current.includes(val)) return;
    saveProfile.mutate({
      nom: profileForm.nom.trim(),
      prenom: profileForm.prenom.trim(),
      ecole: profileForm.ecole.trim(),
      matieres: [...current, val],
    });
    setProfileForm((prev) => ({ ...prev, matiereInput: '' }));
    setProfileDirty(false);
  }

  function removeMatiere(value: string) {
    if (!settings) return;
    saveProfile.mutate({
      nom: profileForm.nom.trim(),
      prenom: profileForm.prenom.trim(),
      ecole: profileForm.ecole.trim(),
      matieres: (settings.matieres ?? []).filter((matiere) => matiere !== value),
    });
  }

  function addOption(key: OptionKey) {
    const val = optionInputs[key].trim();
    if (!val || !settings) return;
    const current = settings[key] ?? [];
    if (current.includes(val)) return;
    const payload: Partial<UserSettings> = { [key]: [...current, val] };
    saveOption.mutate(payload);
    setOptionInputs((prev) => ({ ...prev, [key]: '' }));
  }

  function removeOption(key: OptionKey, value: string) {
    if (!settings) return;
    const payload: Partial<UserSettings> = { [key]: settings[key].filter((v) => v !== value) };
    saveOption.mutate(payload);
  }

  function submitPassword() {
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: 'La confirmation ne correspond pas.' });
      return;
    }
    changePw.mutate({ currentPassword: pwForm.current, newPassword: pwForm.next });
  }

  function logout() {
    localStorage.removeItem('teac_token');
    window.location.href = '/teac/';
  }

  function deleteAccount() {
    setConfirmDelete(true);
    if (window.confirm('Confirmer la suppression du compte ?')) {
      alert('Suppression du compte confirmee.');
    }
    setConfirmDelete(false);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      <aside className="w-56 shrink-0 border-r border-gray-200 p-5">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Parametres</h1>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl">
          {section === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-900 text-2xl font-bold text-white">
                  {initials}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Profil</h2>
                  <p className="text-sm text-gray-500">{settings?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Nom</span>
                  <input
                    value={profileForm.nom}
                    onChange={(e) => updateProfileForm('nom', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Prenom</span>
                  <input
                    value={profileForm.prenom}
                    onChange={(e) => updateProfileForm('prenom', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <input
                    value={settings?.email ?? ''}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Ecole</span>
                  <input
                    value={profileForm.ecole}
                    onChange={(e) => updateProfileForm('ecole', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-700">Matieres</h3>
                <div className="mb-3 flex min-h-8 flex-wrap gap-2">
                  {(settings?.matieres ?? []).map((matiere) => (
                    <span
                      key={matiere}
                      className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
                    >
                      {matiere}
                      <button
                        type="button"
                        onClick={() => removeMatiere(matiere)}
                        className="text-indigo-400 transition-colors hover:text-indigo-700"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={profileForm.matiereInput}
                    onChange={(e) => updateProfileForm('matiereInput', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addMatiere();
                    }}
                    placeholder="Ajouter une matiere"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addMatiere}
                    disabled={!profileForm.matiereInput.trim() || saveProfile.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:opacity-50"
                  >
                    <Plus size={15} />
                    Ajouter
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={submitProfile}
                disabled={!profileDirty || saveProfile.isPending}
                className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:opacity-50"
              >
                Enregistrer
              </button>
            </div>
          )}

          {section === 'personalization' && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-gray-900">Personnalisation</h2>
              {optionSections.map(({ key, label, placeholder }) => (
                <div key={key} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-semibold text-gray-900">{label}</h3>
                  <div className="mb-4 flex min-h-8 flex-wrap gap-2">
                    {(settings?.[key] ?? []).map((val) => (
                      <span
                        key={val}
                        className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
                      >
                        {val}
                        <button
                          type="button"
                          onClick={() => removeOption(key, val)}
                          className="text-indigo-400 transition-colors hover:text-indigo-700"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={optionInputs[key]}
                      onChange={(e) => setOptionInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addOption(key);
                      }}
                      placeholder={placeholder}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => addOption(key)}
                      disabled={!optionInputs[key].trim() || saveOption.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:opacity-50"
                    >
                      <Plus size={15} />
                      Ajouter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-gray-900">Securite</h2>
              {pwMsg && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm font-medium ${
                    pwMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {pwMsg.text}
                </div>
              )}
              {(['current', 'next', 'confirm'] as const).map((key) => (
                <label key={key} className="block space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">
                    {key === 'current' ? 'Actuel' : key === 'next' ? 'Nouveau' : 'Confirmation'}
                  </span>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pwForm[key]}
                      onChange={(e) => setPwForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {key === 'next' && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          passwordLevel === 'strong'
                            ? 'w-full bg-green-500'
                            : passwordLevel === 'medium'
                              ? 'w-2/3 bg-orange-500'
                              : 'w-1/3 bg-red-500'
                        }`}
                      />
                    </div>
                  )}
                  {key === 'confirm' && passwordMismatch && (
                    <span className="text-sm text-red-600">La confirmation ne correspond pas.</span>
                  )}
                </label>
              ))}
              <button
                type="button"
                onClick={submitPassword}
                disabled={pwForm.next.length < 6 || changePw.isPending}
                className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:opacity-50"
              >
                Enregistrer
              </button>

              <TwoFactorSettings />
            </div>
          )}

          {section === 'account' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Compte</h2>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
              >
                Se deconnecter
              </button>

              <div className="rounded-lg border border-red-200 bg-red-50 p-5">
                <h3 className="mb-2 font-semibold text-red-900">Zone danger</h3>
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={confirmDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
