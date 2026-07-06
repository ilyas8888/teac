import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Users, GraduationCap, X, UserPlus, Upload, ScanLine, Rows3 } from 'lucide-react';
import api from '../services/api';
import type { Class, UserSettings } from '../types';

const emptyClass = { nom: '', niveau: '', groupe: '', etablissement: '', annee: '' };
const emptyRow = () => ({ nom: '', prenom: '', email: '' });

type Tab = 'table' | 'excel' | 'scan';

export default function ClassesPage() {
  const qc = useQueryClient();

  // Class form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [form, setForm] = useState(emptyClass);

  // Students modal
  const [activeClass, setActiveClass] = useState<Class | null>(null);
  const [tab, setTab] = useState<Tab>('table');
  const [rows, setRows] = useState([emptyRow()]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: classes = [], isLoading } = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/classes', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); closeForm(); },
  });

  const update = useMutation({
    mutationFn: (data: typeof form) => api.put(`/classes/${editing!.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); closeForm(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  const bulkCreate = useMutation({
    mutationFn: ({ classId, students }: { classId: string; students: typeof rows }) =>
      api.post('/students/bulk', { classId, students }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      setImportMsg(`✓ ${res.data.count} élève(s) ajouté(s)`);
      setRows([emptyRow()]);
    },
  });

  const importExcel = useMutation({
    mutationFn: ({ classId, file }: { classId: string; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('classId', classId);
      return api.post('/students/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      setImportMsg(`✓ ${res.data.count} élève(s) importé(s) sur ${res.data.total} ligne(s)`);
      setExcelFile(null);
      if (fileRef.current) fileRef.current.value = '';
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setImportMsg(`✗ ${err.response?.data?.message || 'Erreur lors de l\'import'}`);
    },
  });

  function openForm() { setEditing(null); setForm(emptyClass); setShowForm(true); }
  function openEdit(cls: Class) { setEditing(cls); setForm({ nom: cls.nom, niveau: cls.niveau, groupe: cls.groupe || '', etablissement: cls.etablissement || '', annee: cls.annee }); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); setForm(emptyClass); }
  function submit() { if (!form.nom || !form.niveau || !form.annee) return; editing ? update.mutate(form) : create.mutate(form); }

  function openStudents(cls: Class) { setActiveClass(cls); setTab('table'); setRows([emptyRow()]); setImportMsg(''); }
  function closeStudents() { setActiveClass(null); setImportMsg(''); setExcelFile(null); }

  function updateRow(i: number, field: string, value: string) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }
  function addRow() { setRows((prev) => [...prev, emptyRow()]); }
  function removeRow(i: number) { setRows((prev) => prev.filter((_, idx) => idx !== i)); }

  const validRows = rows.filter((r) => r.nom.trim() && r.prenom.trim());
  const niveaux = settings?.niveauxOptions ?? [];
  const groupes = settings?.groupesOptions ?? [];
  const etablissements = settings?.etablissementsOptions ?? [];
  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500 mt-1">{classes.length} classe{classes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openForm}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors">
          <Plus size={16} /> Nouvelle classe
        </button>
      </div>

      {/* Class form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{editing ? 'Modifier la classe' : 'Nouvelle classe'}</h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="ex: TSI 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année *</label>
              <input value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })} placeholder="ex: 2025-2026"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau *</label>
              <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Choisir —</option>
                {niveaux.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Groupe</label>
              <select value={form.groupe} onChange={(e) => setForm({ ...form, groupe: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Choisir —</option>
                {groupes.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Établissement</label>
              <select value={form.etablissement} onChange={(e) => setForm({ ...form, etablissement: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Choisir —</option>
                {etablissements.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={submit} disabled={!form.nom || !form.niveau || !form.annee || isPending}
              className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
              {isPending ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
            </button>
            <button onClick={closeForm}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Classes grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <GraduationCap size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Aucune classe pour l'instant.</p>
          <button onClick={openForm} className="mt-4 text-indigo-600 text-sm font-medium hover:underline">Créer votre première classe</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <GraduationCap size={20} className="text-indigo-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(cls)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Pencil size={15} /></button>
                  <button onClick={() => { if (window.confirm(`Supprimer "${cls.nom}" ?`)) remove.mutate(cls.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{cls.nom}</h3>
              <p className="text-sm text-gray-600">{cls.niveau}</p>
              {cls.groupe && <p className="text-xs text-indigo-600 font-medium mt-0.5">{cls.groupe}</p>}
              {cls.etablissement && <p className="text-xs text-gray-400 mt-0.5">{cls.etablissement}</p>}
              <p className="text-xs text-gray-400 mt-1">{cls.annee}</p>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Users size={14} />{cls._count?.students ?? 0} élève{(cls._count?.students ?? 0) !== 1 ? 's' : ''}
                </span>
                <button onClick={() => openStudents(cls)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                  <UserPlus size={13} /> Ajouter des élèves
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Students modal */}
      {activeClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Ajouter des élèves</h2>
                <p className="text-sm text-gray-500">{activeClass.nom} — {activeClass.niveau}{activeClass.groupe ? ` · ${activeClass.groupe}` : ''}</p>
              </div>
              <button onClick={closeStudents} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {([
                { id: 'table', label: 'Saisie manuelle', icon: Rows3 },
                { id: 'excel', label: 'Fichier Excel', icon: Upload },
                { id: 'scan', label: 'Scanner', icon: ScanLine, soon: true },
              ] as const).map(({ id, label, icon: Icon, soon }) => (
                <button key={id} onClick={() => { if (!soon) { setTab(id); setImportMsg(''); } }}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  } ${soon ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Icon size={15} />{label}{soon && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Bientôt</span>}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {importMsg && (
                <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${importMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {importMsg}
                </div>
              )}

              {tab === 'table' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left pb-2 pr-3 font-medium text-gray-600 w-8">#</th>
                          <th className="text-left pb-2 pr-3 font-medium text-gray-600">Prénom *</th>
                          <th className="text-left pb-2 pr-3 font-medium text-gray-600">Nom *</th>
                          <th className="text-left pb-2 font-medium text-gray-600">Email</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-2 pr-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="py-1.5 pr-2">
                              <input value={row.prenom} onChange={(e) => updateRow(i, 'prenom', e.target.value)}
                                placeholder="Prénom"
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                            </td>
                            <td className="py-1.5 pr-2">
                              <input value={row.nom} onChange={(e) => updateRow(i, 'nom', e.target.value)}
                                placeholder="Nom"
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                            </td>
                            <td className="py-1.5">
                              <input value={row.email} onChange={(e) => updateRow(i, 'email', e.target.value)}
                                placeholder="email@exemple.com" type="email"
                                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                            </td>
                            <td className="py-1.5 pl-2">
                              {rows.length > 1 && (
                                <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-400 transition-colors"><X size={14} /></button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={addRow}
                    className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                    <Plus size={14} /> Ajouter une ligne
                  </button>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => bulkCreate.mutate({ classId: activeClass.id, students: validRows })}
                      disabled={validRows.length === 0 || bulkCreate.isPending}
                      className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                      {bulkCreate.isPending ? 'Enregistrement...' : `Enregistrer ${validRows.length > 0 ? `(${validRows.length})` : ''}`}
                    </button>
                    <span className="text-xs text-gray-400">* Champs obligatoires</span>
                  </div>
                </div>
              )}

              {tab === 'excel' && (
                <div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-5 text-sm text-blue-700">
                    <p className="font-medium mb-1">Format attendu (colonnes requises) :</p>
                    <p><span className="font-mono bg-blue-100 px-1 rounded">Nom</span> · <span className="font-mono bg-blue-100 px-1 rounded">Prénom</span> · <span className="font-mono bg-blue-100 px-1 rounded">Email</span> (optionnel)</p>
                    <p className="mt-1 text-blue-600">Formats acceptés : .xlsx, .xls, .csv</p>
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors">
                    <Upload size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 mb-3">Glissez votre fichier ici ou</p>
                    <label className="cursor-pointer bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors">
                      Choisir un fichier
                      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                        onChange={(e) => { setExcelFile(e.target.files?.[0] || null); setImportMsg(''); }} />
                    </label>
                    {excelFile && <p className="mt-3 text-sm text-indigo-600 font-medium">{excelFile.name}</p>}
                  </div>
                  {excelFile && (
                    <button
                      onClick={() => importExcel.mutate({ classId: activeClass.id, file: excelFile })}
                      disabled={importExcel.isPending}
                      className="mt-4 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                      {importExcel.isPending ? 'Import en cours...' : 'Importer'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
