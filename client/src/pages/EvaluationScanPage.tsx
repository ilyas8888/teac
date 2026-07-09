import { useState } from 'react';
import { ArrowLeft, CheckCircle, ScanLine, Upload, AlertTriangle, RotateCcw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { Evaluation, EvaluationContent, Student } from '../types';
import type { QcmRow, BubbleResult, AnalysisOk } from '../utils/omr';
import { analyzeSheet } from '../utils/omr';
import type { QcmBlock } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractQcmRows(evaluation: Evaluation): QcmRow[] {
  const content   = evaluation.content as EvaluationContent | null;
  const exercices = content?.exercices ?? [];
  const rows: QcmRow[] = [];
  exercices.forEach((ex, exIdx) => {
    ex.questions.forEach((q, qIdx) => {
      const qcm = q.blocks.find(b => b.type === 'qcm') as QcmBlock | undefined;
      if (qcm) rows.push({
        label:      `Q${exIdx + 1}.${qIdx + 1}`,
        questionId: q.id,
        options:    qcm.options,
        correctes:  qcm.correctes ?? [],
        points:     q.points,
        multiple:   qcm.multiple ?? false,
      });
    });
  });
  return rows;
}

type Phase = 'upload' | 'processing' | 'results' | 'done';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EvaluationScanPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const [phase,     setPhase]     = useState<Phase>('upload');
  const [scanFile,  setScanFile]  = useState<File | null>(null);
  const [preview,   setPreview]   = useState('');
  const [result,    setResult]    = useState<AnalysisOk | null>(null);
  const [errMsg,    setErrMsg]    = useState('');
  const [studentId, setStudentId] = useState('');

  const { data: evaluation } = useQuery<Evaluation>({
    queryKey: ['evaluation', id],
    queryFn: () => api.get(`/evaluations/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => api.get('/students').then(r => r.data),
    enabled: phase === 'results',
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.put('/grades', {
      studentId,
      evaluationId: id,
      note:         result!.totalEarned,
      commentaire:  'Corrigé par OMR — Teac',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] });
      qc.invalidateQueries({ queryKey: ['evaluation', id] });
      setPhase('done');
    },
  });

  const [isPreparing, setIsPreparing] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function renderPdfToFile(file: File): Promise<File> {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const data    = await file.arrayBuffer();
    const pdf     = await pdfjsLib.getDocument({ data }).promise;
    // La feuille de réponses est toujours la dernière page (page-break-before: always)
    const page    = await pdf.getPage(pdf.numPages);
    const base    = page.getViewport({ scale: 1 });
    const scale   = Math.min(2, 1400 / base.width);
    const vp      = page.getViewport({ scale });
    const canvas  = document.createElement('canvas');
    canvas.width  = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.92));
    return new File([blob], file.name.replace(/\.pdf$/i, '.jpg'), { type: 'image/jpeg' });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function pickFile(file: File) {
    setErrMsg('');
    let imgFile = file;
    if (file.type === 'application/pdf') {
      setIsPreparing(true);
      try { imgFile = await renderPdfToFile(file); }
      catch { setErrMsg('Impossible de lire ce PDF. Essayez de l\'exporter en image.'); setIsPreparing(false); return; }
      setIsPreparing(false);
    }
    setScanFile(imgFile);
    setPreview(URL.createObjectURL(imgFile));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith('image/') || f.type === 'application/pdf')) pickFile(f);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  }

  async function handleAnalyze() {
    if (!scanFile || !evaluation) return;
    const rows = extractQcmRows(evaluation);
    if (rows.length === 0) { setErrMsg("Cette évaluation ne contient aucune question QCM."); return; }

    setPhase('processing');
    const res = await analyzeSheet(scanFile, rows);
    if ('error' in res) {
      setErrMsg(res.error);
      setPhase('upload');
    } else {
      setResult(res);
      setPhase('results');
    }
  }

  function reset() {
    setScanFile(null);
    setPreview('');
    setResult(null);
    setErrMsg('');
    setStudentId('');
    setPhase('upload');
  }

  const qcmRows = evaluation ? extractQcmRows(evaluation) : [];
  const noQcm   = evaluation && qcmRows.length === 0;

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Link to={`/evaluations/${id}`}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            <ArrowLeft size={16} /> Retour
          </Link>
          <div className="flex-1">
            <p className="text-xs text-gray-400">Correction OMR</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{evaluation?.titre ?? '…'}</p>
          </div>
          {phase === 'results' && (
            <button onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RotateCcw size={14} /> Nouveau scan
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">

        {/* ── Pas de QCM ── */}
        {noQcm && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center text-gray-400">
            <ScanLine size={40} className="mx-auto mb-3 opacity-30" />
            <p className="mb-2 font-medium">Aucune question QCM dans ce contrôle.</p>
            <p className="text-sm">Ajoutez des blocs QCM pour utiliser la correction automatique.</p>
          </div>
        )}

        {/* ── Phase : upload ── */}
        {!noQcm && phase === 'upload' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Scanner une feuille de réponses</h1>
              <p className="mt-1 text-sm text-gray-500">
                {qcmRows.length} question{qcmRows.length > 1 ? 's' : ''} QCM détectée{qcmRows.length > 1 ? 's' : ''} •
                Photographiez la feuille à plat sous un bon éclairage
              </p>
            </div>

            {errMsg && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{errMsg}</span>
              </div>
            )}

            {/* Zone de dépôt */}
            {!scanFile ? (
              <label
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 py-20 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                {isPreparing ? (
                  <>
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                    <span className="text-sm font-medium">Conversion du PDF…</span>
                  </>
                ) : (
                  <>
                    <Upload size={36} />
                    <span className="text-base font-medium">Glissez le scan ici ou cliquez pour choisir</span>
                    <span className="text-xs text-indigo-400">JPG, PNG, WEBP ou PDF</span>
                  </>
                )}
                <input type="file" accept="image/*,application/pdf" onChange={handleInput} className="hidden" />
              </label>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <img src={preview} alt="aperçu" className="max-h-96 w-full object-contain bg-gray-50" />
                <div className="flex items-center gap-3 px-5 py-4">
                  <p className="flex-1 truncate text-sm text-gray-700">{scanFile.name}</p>
                  <label className="cursor-pointer text-xs text-indigo-600 hover:underline">
                    Changer
                    <input type="file" accept="image/*,application/pdf" onChange={handleInput} className="hidden" />
                  </label>
                  <button
                    onClick={handleAnalyze}
                    className="rounded-lg bg-indigo-900 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                  >
                    Analyser →
                  </button>
                </div>
              </div>
            )}

            {/* Conseils */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
              <p className="mb-3 font-semibold text-gray-800">Conseils pour un bon scan</p>
              <ul className="space-y-1.5 text-gray-500">
                <li>• <strong>PDF</strong> : la <strong>dernière page</strong> est utilisée automatiquement (c'est là que se trouve la feuille de réponses)</li>
                <li>• <strong>Photo</strong> : posez la feuille sur une surface blanche et bien éclairée, cadrez à la verticale</li>
                <li>• Les <strong>4 carrés noirs</strong> aux coins doivent être entièrement visibles</li>
                <li>• L'élève doit noircir entièrement la bulle, pas cocher en croix</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Phase : processing ── */}
        {phase === 'processing' && (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-gray-500">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <p className="text-sm font-medium">Analyse de la feuille en cours…</p>
            <p className="text-xs text-gray-400">Détection des repères · Lecture des bulles · Calcul du score</p>
          </div>
        )}

        {/* ── Phase : results ── */}
        {phase === 'results' && result && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

            {/* Scan annoté */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="text-sm font-semibold text-gray-800">Scan analysé</p>
                <p className="text-xs text-gray-400">
                  <span className="text-green-600 font-medium">■ Bon</span>
                  {' · '}
                  <span className="text-red-500 font-medium">■ Faux</span>
                  {' · '}
                  <span className="text-amber-500 font-medium">■ Attendu non coché</span>
                </p>
              </div>
              <img src={result.debugUrl} alt="scan annoté" className="w-full object-contain bg-gray-50" />
            </div>

            {/* Panneau résultats */}
            <div className="space-y-4">
              {/* Score */}
              <div className={`rounded-2xl p-5 text-center ${result.totalEarned === result.totalPoints ? 'bg-green-50 border border-green-200' : result.totalEarned >= result.totalPoints * 0.5 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-4xl font-bold text-gray-900">{result.totalEarned}<span className="text-xl text-gray-400">/{result.totalPoints}</span></p>
                <p className="mt-1 text-sm text-gray-500">
                  {Math.round(result.totalEarned / result.totalPoints * 100)} % de réussite sur les QCM
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Note finale sur {evaluation?.bareme} pts à saisir manuellement si d'autres questions existent
                </p>
              </div>

              {/* Table de détail */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-auto max-h-72">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Q</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Détecté</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Attendu</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.results.map((r: BubbleResult) => (
                        <tr key={r.label} className={r.isCorrect ? 'bg-green-50/40' : 'bg-red-50/40'}>
                          <td className="px-3 py-2 font-mono text-xs text-gray-700">{r.label}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">
                            {r.detected.length === 0 ? '—' : r.detected.map(i => String.fromCharCode(65 + i)).join(', ')}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700">
                            {r.correctes.length === 0 ? '—' : r.correctes.map(i => String.fromCharCode(65 + i)).join(', ')}
                          </td>
                          <td className="px-2 py-2 text-right text-xs font-semibold">
                            {r.isCorrect
                              ? <span className="text-green-600">+{r.points}</span>
                              : <span className="text-red-500">0/{r.points}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sélection élève + confirmation */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Attribuer à un élève</p>
                <select
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Sélectionner un élève —</option>
                  {students.map((s: Student) => (
                    <option key={s.id} value={s.id}>
                      {s.nom} {s.prenom}{s.class ? ` (${s.class.nom})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => confirmMutation.mutate()}
                  disabled={!studentId || confirmMutation.isPending}
                  className="w-full rounded-lg bg-indigo-900 py-2.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {confirmMutation.isPending ? 'Enregistrement…' : `Confirmer ${result.totalEarned} pts`}
                </button>
                {confirmMutation.isError && (
                  <p className="text-xs text-red-600">Erreur lors de l'enregistrement. Réessayez.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Phase : done ── */}
        {phase === 'done' && result && (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Note enregistrée</h2>
              <p className="mt-1 text-gray-500">
                {result.totalEarned} / {result.totalPoints} pts sur les QCM
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ScanLine size={15} /> Scanner un autre élève
              </button>
              <Link to={`/evaluations/${id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-800">
                Voir l'évaluation
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
