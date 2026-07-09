import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, BarChart2, BookOpen, Plus, Pencil, Trash2, X, Upload, FileText, Check, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';
import type { Student, ClassStats } from '../types';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

type MainTab = 'eleves' | 'resultats' | 'progression';
type AddMode = 'single' | 'table' | 'pdf';
type StudentForm = { nom: string; prenom: string; email: string };
type PdfRow = { nom: string; prenom: string; include: boolean };

const emptyStudent = (): StudentForm => ({ nom: '', prenom: '', email: '' });
const emptyTableRow = (): StudentForm => ({ nom: '', prenom: '', email: '' });

export default function ClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pdfRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<MainTab>('eleves');
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const [singleForm, setSingleForm] = useState<StudentForm>(emptyStudent());
  const [tableRows, setTableRows] = useState<StudentForm[]>([emptyTableRow()]);
  const [pdfRows, setPdfRows] = useState<PdfRow[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<StudentForm>(emptyStudent());
  const [openCourses, setOpenCourses] = useState<Set<string>>(new Set());

  const { data: stats, isLoading } = useQuery<ClassStats>({
    queryKey: ['class-stats', id],
    queryFn: () => api.get(`/classes/${id}/stats`).then((r) => r.data),
    enabled: Boolean(id),
  });

  const invalidateStats = () => qc.invalidateQueries({ queryKey: ['class-stats', id] });

  const createStudent = useMutation({
    mutationFn: (data: StudentForm) => api.post('/students', { ...data, email: data.email || undefined, classId: id }),
    onSuccess: () => {
      invalidateStats();
      setSingleForm(emptyStudent());
    },
  });

  const bulkCreate = useMutation({
    mutationFn: (students: StudentForm[]) => api.post('/students/bulk', { classId: id, students }),
    onSuccess: () => {
      invalidateStats();
      setTableRows([emptyTableRow()]);
      setPdfRows([]);
      setPdfMsg('');
    },
  });

  const updateStudent = useMutation({
    mutationFn: ({ sid, data }: { sid: string; data: StudentForm }) =>
      api.put(`/students/${sid}`, { ...data, email: data.email || undefined, classId: id }),
    onSuccess: () => {
      invalidateStats();
      setEditingStudent(null);
      setEditForm(emptyStudent());
    },
  });

  const deleteStudent = useMutation({
    mutationFn: (sid: string) => api.delete(`/students/${sid}`),
    onSuccess: invalidateStats,
  });

  const toggleRealise = useMutation({
    mutationFn: (sessionId: string) => api.patch(`/sessions/${sessionId}/realise`),
    onSuccess: invalidateStats,
  });

  function updateTableRow(index: number, field: keyof StudentForm, value: string) {
    setTableRows((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  function updatePdfRow(index: number, field: keyof PdfRow, value: string | boolean) {
    setPdfRows((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }

  function startEdit(student: Student) {
    setEditingStudent(student);
    setEditForm({ nom: student.nom, prenom: student.prenom, email: student.email || '' });
  }

  function toggleCourse(courseId: string) {
    setOpenCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }

  async function handlePdfFile(file: File) {
    setPdfLoading(true);
    setPdfMsg('');
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      const lines: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageLines = new Map<number, string[]>();

        content.items.forEach((item) => {
          if (!('str' in item) || !item.str.trim()) return;
          const transform = 'transform' in item ? item.transform : [];
          const y = Array.isArray(transform) && typeof transform[5] === 'number' ? Math.round(transform[5]) : 0;
          pageLines.set(y, [...(pageLines.get(y) ?? []), item.str]);
        });

        [...pageLines.entries()]
          .sort(([a], [b]) => b - a)
          .forEach(([, parts]) => lines.push(parts.join(' ')));
      }

      const rows = lines
        .flatMap((line) => line.split(/\s{2,}/))
        .map((line) => line.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
        .map((line) => {
          const words = line.split(' ').filter(Boolean);
          const nomWords = words.filter((word) => /^[A-ZÀ-ÖØ-Þ'-]+$/.test(word) && /[A-ZÀ-ÖØ-Þ]/.test(word));
          const prenomWords = words.filter((word) => !nomWords.includes(word));
          return {
            nom: nomWords.join(' '),
            prenom: prenomWords.join(' '),
            include: true,
          };
        })
        .filter((row) => row.nom || row.prenom);

      setPdfRows(rows);
      setPdfMsg(rows.length > 0 ? `${rows.length} eleve(s) detecte(s). Verifiez avant import.` : 'Aucun eleve detecte dans ce PDF.');
    } catch {
      setPdfMsg('Erreur lors de la lecture du PDF.');
    } finally {
      setPdfLoading(false);
    }
  }

  const students = [...(stats?.students ?? [])].sort((a, b) =>
    `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')
  );
  const validTableRows = tableRows.filter((row) => row.nom.trim() && row.prenom.trim());
  const validPdfRows = pdfRows.filter((row) => row.include && row.nom.trim() && row.prenom.trim());

  const sessionsByCourse = (stats?.sessions ?? []).reduce<Record<string, { course: ClassStats['sessions'][number]['course']; sessions: ClassStats['sessions'] }>>((acc, session) => {
    const courseId = session.course.id;
    if (!acc[courseId]) acc[courseId] = { course: session.course, sessions: [] };
    acc[courseId].sessions.push(session);
    return acc;
  }, {});

  function gradeFor(studentId: string, evaluationId: string) {
    return stats?.grades.find((grade) => grade.studentId === studentId && grade.evaluationId === evaluationId);
  }

  function heatClass(note: number, bareme: number) {
    const ratio = bareme > 0 ? note / bareme : 0;
    if (ratio >= 0.7) return 'bg-green-100 text-green-700';
    if (ratio >= 0.5) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <button onClick={() => navigate('/classes')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-sm text-gray-500">
          Classe introuvable.
        </div>
      </div>
    );
  }

  const classInfo = stats.class;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6">
        <button onClick={() => navigate('/classes')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{classInfo.nom}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {classInfo.niveau} {classInfo.groupe ? `- ${classInfo.groupe}` : ''} - {classInfo.annee}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
              <Users size={15} /> {students.length} eleve{students.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex border-b border-gray-200">
            {([
              { id: 'eleves', label: 'Eleves', icon: Users },
              { id: 'resultats', label: 'Resultats', icon: BarChart2 },
              { id: 'progression', label: 'Progression', icon: BookOpen },
            ] as const).map(({ id: tabId, label, icon: Icon }) => (
              <button
                key={tabId}
                onClick={() => setTab(tabId)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === tabId ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'eleves' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{students.length} eleves</h2>
            <button onClick={() => setAddMode(addMode ? null : 'single')} className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800">
              <Plus size={16} /> Ajouter
            </button>
          </div>

          {addMode && (
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex border-b border-gray-200 mb-4">
                {([
                  { id: 'single', label: 'Un eleve' },
                  { id: 'table', label: 'Tableau' },
                  { id: 'pdf', label: 'PDF' },
                ] as const).map(({ id: mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => setAddMode(mode)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      addMode === mode ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {addMode === 'single' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input value={singleForm.nom} onChange={(e) => setSingleForm({ ...singleForm, nom: e.target.value })} placeholder="Nom" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input value={singleForm.prenom} onChange={(e) => setSingleForm({ ...singleForm, prenom: e.target.value })} placeholder="Prenom" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input value={singleForm.email} onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })} placeholder="Email" type="email" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button onClick={() => createStudent.mutate(singleForm)} disabled={!singleForm.nom || !singleForm.prenom || createStudent.isPending} className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
                    Ajouter
                  </button>
                </div>
              )}

              {addMode === 'table' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left pb-2 pr-2 font-medium text-gray-600">Nom</th>
                          <th className="text-left pb-2 pr-2 font-medium text-gray-600">Prenom</th>
                          <th className="text-left pb-2 pr-2 font-medium text-gray-600">Email</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-2 pr-2"><input value={row.nom} onChange={(e) => updateTableRow(i, 'nom', e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" /></td>
                            <td className="py-2 pr-2"><input value={row.prenom} onChange={(e) => updateTableRow(i, 'prenom', e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" /></td>
                            <td className="py-2 pr-2"><input value={row.email} onChange={(e) => updateTableRow(i, 'email', e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" /></td>
                            <td className="py-2">{tableRows.length > 1 && <button onClick={() => setTableRows((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500"><X size={15} /></button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={() => setTableRows((prev) => [...prev, emptyTableRow()])} className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800">
                    <Plus size={14} /> Ajouter une ligne
                  </button>
                  <button onClick={() => bulkCreate.mutate(validTableRows)} disabled={validTableRows.length === 0 || bulkCreate.isPending} className="mt-4 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
                    Enregistrer {validTableRows.length > 0 ? `(${validTableRows.length})` : ''}
                  </button>
                </div>
              )}

              {addMode === 'pdf' && (
                <div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) void handlePdfFile(file);
                    }}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors bg-white"
                  >
                    <Upload size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 mb-3">Glissez un PDF ici ou</p>
                    <button onClick={() => pdfRef.current?.click()} className="inline-flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800">
                      <FileText size={16} /> Choisir un PDF
                    </button>
                    <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handlePdfFile(file); }} />
                    {pdfLoading && <p className="mt-3 text-sm text-indigo-600">Lecture en cours...</p>}
                    {pdfMsg && <p className="mt-3 text-sm text-gray-600">{pdfMsg}</p>}
                  </div>
                  {pdfRows.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left pb-2 pr-2 font-medium text-gray-600">Importer</th>
                            <th className="text-left pb-2 pr-2 font-medium text-gray-600">Nom</th>
                            <th className="text-left pb-2 pr-2 font-medium text-gray-600">Prenom</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pdfRows.map((row, i) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-2 pr-2"><input type="checkbox" checked={row.include} onChange={(e) => updatePdfRow(i, 'include', e.target.checked)} /></td>
                              <td className="py-2 pr-2"><input value={row.nom} onChange={(e) => updatePdfRow(i, 'nom', e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5" /></td>
                              <td className="py-2 pr-2"><input value={row.prenom} onChange={(e) => updatePdfRow(i, 'prenom', e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button onClick={() => bulkCreate.mutate(validPdfRows.map(({ nom, prenom }) => ({ nom, prenom, email: '' })))} disabled={validPdfRows.length === 0 || bulkCreate.isPending} className="mt-4 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
                        Importer {validPdfRows.length} eleves
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {students.map((student) => (
              <div key={student.id} className="p-4 flex items-center justify-between gap-4">
                {editingStudent?.id === student.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 flex-1">
                    <input value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <input value={editForm.prenom} onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <button onClick={() => updateStudent.mutate({ sid: student.id, data: editForm })} disabled={!editForm.nom || !editForm.prenom || updateStudent.isPending} className="flex items-center justify-center gap-1.5 bg-indigo-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50"><Check size={15} /> Valider</button>
                    <button onClick={() => setEditingStudent(null)} className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"><X size={15} /> Annuler</button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-gray-900">{student.nom} {student.prenom}</p>
                      {student.email && <p className="text-sm text-gray-500">{student.email}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(student)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Pencil size={15} /></button>
                      <button onClick={() => { if (window.confirm(`Supprimer "${student.nom} ${student.prenom}" ?`)) deleteStudent.mutate(student.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {students.length === 0 && <div className="p-8 text-center text-sm text-gray-500">Aucun eleve dans cette classe.</div>}
          </div>
        </div>
      )}

      {tab === 'resultats' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {stats.evaluations.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune note enregistree pour cette classe.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="sticky left-0 bg-white text-left py-3 pr-4 font-medium text-gray-600">Eleve</th>
                    {stats.evaluations.map((evaluation) => (
                      <th key={evaluation.id} className="text-center py-3 px-2 font-medium text-gray-600 min-w-28">
                        {evaluation.titre.length > 12 ? `${evaluation.titre.slice(0, 12)}...` : evaluation.titre}
                        <span className="block text-xs text-gray-400">/{evaluation.bareme}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100">
                      <td className="sticky left-0 bg-white py-3 pr-4 font-medium text-gray-900">{student.nom} {student.prenom}</td>
                      {stats.evaluations.map((evaluation) => {
                        const grade = gradeFor(student.id, evaluation.id);
                        return (
                          <td key={evaluation.id} className="py-3 px-2 text-center">
                            {grade ? (
                              <span className={`inline-flex justify-center min-w-16 rounded-full px-2 py-1 text-xs font-medium ${heatClass(grade.note, evaluation.bareme)}`}>
                                {grade.note}/{evaluation.bareme}
                              </span>
                            ) : (
                              <span className="inline-flex justify-center min-w-16 rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500">Absent</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="sticky left-0 bg-white py-3 pr-4 font-semibold text-gray-900">Moyenne</td>
                    {stats.evaluations.map((evaluation) => {
                      const notes = stats.grades.filter((grade) => grade.evaluationId === evaluation.id).map((grade) => grade.note);
                      const avg = notes.length ? notes.reduce((sum, note) => sum + note, 0) / notes.length : null;
                      return (
                        <td key={evaluation.id} className="py-3 px-2 text-center font-semibold text-gray-700">
                          {avg === null ? '-' : `${avg.toFixed(1)}/${evaluation.bareme}`}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'progression' && (
        <div className="space-y-4">
          {Object.values(sessionsByCourse).map(({ course, sessions }) => {
            const done = sessions.filter((session) => session.realise).length;
            const progress = sessions.length ? Math.round((done / sessions.length) * 100) : 0;
            const isOpen = openCourses.has(course.id);
            return (
              <div key={course.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <button onClick={() => toggleCourse(course.id)} className="w-full p-5 flex items-center gap-4 text-left">
                  {isOpen ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{course.nom}</h3>
                        <p className="text-sm text-gray-500">{course.matiere}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{done}/{sessions.length}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 divide-y divide-gray-100">
                    {sessions.map((session) => (
                      <label key={session.id} className="flex items-center gap-3 py-3 cursor-pointer">
                        <input type="checkbox" checked={Boolean(session.realise)} onChange={() => toggleRealise.mutate(session.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="flex-1 text-sm font-medium text-gray-900">{session.titre}</span>
                        <span className="text-xs text-gray-500">{new Date(session.date).toLocaleDateString('fr-FR')}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {Object.keys(sessionsByCourse).length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-sm text-gray-500">
              Aucune session associee a cette classe.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
