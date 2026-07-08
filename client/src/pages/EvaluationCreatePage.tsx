import React, { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type {
  Course, Evaluation, EvalExercice, EvalQuestion, EvaluationContent,
  ContentBlock, BlockType, TextBlock, ImageBlock, TableBlock, QcmBlock,
} from '../types';

// ---------- helpers ----------

interface EvaluationForm { titre: string; bareme: string; date: string; courseIds: string[]; }
const emptyForm: EvaluationForm = { titre: '', bareme: '20', date: '', courseIds: [] };
const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function toDatetimeLocal(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function makeBlock(type: BlockType): ContentBlock {
  switch (type) {
    case 'text':  return { type: 'text', content: '' };
    case 'image': return { type: 'image', url: '' };
    case 'table': return { type: 'table', headers: ['', '', ''], rows: [['', '', ''], ['', '', '']] };
    case 'qcm':  return { type: 'qcm', multiple: false, options: ['', '', '', ''], correctes: [] };
  }
}

function makeQuestion(): EvalQuestion {
  return { id: crypto.randomUUID(), points: 1, blocks: [] };
}

const BLOCK_LABEL: Record<BlockType, string> = { text: 'Texte', image: 'Image', table: 'Tableau', qcm: 'QCM' };
const BLOCK_COLOR: Record<BlockType, string> = {
  text:  'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100',
  image: 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
  table: 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100',
  qcm:   'border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100',
};
const BLOCK_BADGE: Record<BlockType, string> = {
  text:  'bg-blue-50 text-blue-600',
  image: 'bg-emerald-50 text-emerald-600',
  table: 'bg-orange-50 text-orange-600',
  qcm:   'bg-purple-50 text-purple-600',
};

// ---------- Block editors ----------

function TextBlockEditor({ block, onChange, onRemove }: {
  block: TextBlock; onChange: (b: ContentBlock) => void; onRemove: () => void;
}) {
  return (
    <div className="relative">
      <div className="mb-1 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BLOCK_BADGE.text}`}>Texte</span>
        <button type="button" onClick={onRemove} className="ml-auto text-xs text-gray-300 hover:text-red-400">×</button>
      </div>
      <textarea
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="Consigne, contexte, question…"
        rows={3}
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function ImageBlockEditor({ block, onChange, onRemove }: {
  block: ImageBlock; onChange: (b: ContentBlock) => void; onRemove: () => void;
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...block, url: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BLOCK_BADGE.image}`}>Image</span>
        <button type="button" onClick={onRemove} className="ml-auto text-xs text-gray-300 hover:text-red-400">×</button>
      </div>

      {block.url ? (
        <div className="relative">
          <img
            src={block.url}
            alt="aperçu"
            className="max-h-56 w-full rounded-lg border border-gray-200 object-contain bg-gray-50"
          />
          <button
            type="button"
            onClick={() => onChange({ ...block, url: '' })}
            className="absolute right-2 top-2 rounded-full bg-white/80 px-2 py-0.5 text-xs text-gray-500 shadow hover:bg-white hover:text-red-500"
          >
            Changer
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50/50 py-6 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span className="text-sm font-medium">Choisir une image depuis votre machine</span>
          <span className="text-xs text-emerald-400">PNG, JPG, GIF, SVG…</span>
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      )}

      <input
        value={block.caption ?? ''}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Légende (optionnel)"
        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-300"
      />
    </div>
  );
}

function TableBlockEditor({ block, onChange, onRemove }: {
  block: TableBlock; onChange: (b: ContentBlock) => void; onRemove: () => void;
}) {
  const numCols = block.headers.length;

  function setCell(rowIdx: number, colIdx: number, value: string) {
    if (rowIdx === 0) {
      onChange({ ...block, headers: block.headers.map((h, i) => i === colIdx ? value : h) });
    } else {
      onChange({
        ...block,
        rows: block.rows.map((row, ri) =>
          ri === rowIdx - 1 ? row.map((c, ci) => ci === colIdx ? value : c) : row
        ),
      });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BLOCK_BADGE.table}`}>Tableau</span>
        <button type="button" onClick={onRemove} className="ml-auto text-xs text-gray-300 hover:text-red-400">×</button>
      </div>
      <div className="overflow-auto rounded border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {[block.headers, ...block.rows].map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx === 0 ? 'bg-gray-100' : rowIdx % 2 === 0 ? '' : 'bg-gray-50'}>
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="border border-gray-200 p-0">
                    <input
                      value={cell}
                      onChange={(e) => setCell(rowIdx, colIdx, e.target.value)}
                      placeholder={rowIdx === 0 ? `En-tête ${colIdx + 1}` : ''}
                      className={`w-full min-w-[70px] px-2 py-1.5 outline-none focus:bg-orange-50 ${rowIdx === 0 ? 'font-semibold' : ''}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <button type="button" onClick={() => onChange({ ...block, rows: [...block.rows, Array(numCols).fill('')] })}
          className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50">+ Ligne</button>
        {block.rows.length > 0 && (
          <button type="button" onClick={() => onChange({ ...block, rows: block.rows.slice(0, -1) })}
            className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50">− Ligne</button>
        )}
        <button type="button" onClick={() => onChange({ ...block, headers: [...block.headers, ''], rows: block.rows.map(r => [...r, '']) })}
          className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50">+ Colonne</button>
        {numCols > 1 && (
          <button type="button" onClick={() => onChange({ ...block, headers: block.headers.slice(0, -1), rows: block.rows.map(r => r.slice(0, -1)) })}
            className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50">− Colonne</button>
        )}
      </div>
    </div>
  );
}

function QcmBlockEditor({ block, onChange, onRemove }: {
  block: QcmBlock; onChange: (b: ContentBlock) => void; onRemove: () => void;
}) {
  function toggleCorrecte(i: number) {
    if (block.multiple) {
      const already = block.correctes.includes(i);
      onChange({ ...block, correctes: already ? block.correctes.filter((c) => c !== i) : [...block.correctes, i] });
    } else {
      onChange({ ...block, correctes: block.correctes[0] === i ? [] : [i] });
    }
  }

  const correctesLabel = block.correctes
    .sort((a, b) => a - b)
    .map((i) => String.fromCharCode(65 + i))
    .join(', ');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BLOCK_BADGE.qcm}`}>QCM</span>
        {/* Toggle choix unique / multiple */}
        <button
          type="button"
          onClick={() => onChange({ ...block, multiple: !block.multiple, correctes: [] })}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${block.multiple ? 'border-purple-300 bg-purple-100 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-purple-200'}`}
        >
          {block.multiple ? 'Choix multiple' : 'Choix unique'}
        </button>
        <button type="button" onClick={onRemove} className="ml-auto text-xs text-gray-300 hover:text-red-400">×</button>
      </div>
      <div className="space-y-1.5 pl-1">
        {block.options.map((opt, i) => {
          const isCorrecte = block.correctes.includes(i);
          return (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCorrecte(i)}
                title="Bonne réponse"
                className={`h-4 w-4 shrink-0 border-2 transition-colors ${block.multiple ? 'rounded' : 'rounded-full'} ${isCorrecte ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`}
              />
              <span className="w-4 shrink-0 text-xs font-bold text-gray-400">{String.fromCharCode(65 + i)}</span>
              <input
                value={opt}
                onChange={(e) => onChange({ ...block, options: block.options.map((o, j) => j === i ? e.target.value : o) })}
                placeholder={`Option ${String.fromCharCode(65 + i)}…`}
                className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-purple-300"
              />
            </div>
          );
        })}
        {block.correctes.length > 0 && (
          <p className="pl-6 text-xs text-green-600">
            {block.multiple ? 'Bonnes réponses' : 'Bonne réponse'} : {correctesLabel}
          </p>
        )}
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange, onRemove }: {
  block: ContentBlock; onChange: (b: ContentBlock) => void; onRemove: () => void;
}) {
  if (block.type === 'text')  return <TextBlockEditor  block={block as TextBlock}  onChange={onChange} onRemove={onRemove} />;
  if (block.type === 'image') return <ImageBlockEditor block={block as ImageBlock} onChange={onChange} onRemove={onRemove} />;
  if (block.type === 'table') return <TableBlockEditor block={block as TableBlock} onChange={onChange} onRemove={onRemove} />;
  if (block.type === 'qcm')  return <QcmBlockEditor   block={block as QcmBlock}  onChange={onChange} onRemove={onRemove} />;
  return null;
}

// ---------- Question editor ----------

function QuestionEditor({ ex, q, exIdx, qIdx, onUpdate, onRemove }: {
  ex: EvalExercice; q: EvalQuestion; exIdx: number; qIdx: number;
  onUpdate: (q: EvalQuestion) => void; onRemove: () => void;
}) {
  function addBlock(type: BlockType) {
    onUpdate({ ...q, blocks: [...q.blocks, makeBlock(type)] });
  }
  function updateBlock(idx: number, block: ContentBlock) {
    onUpdate({ ...q, blocks: q.blocks.map((b, i) => i === idx ? block : b) });
  }
  function removeBlock(idx: number) {
    onUpdate({ ...q, blocks: q.blocks.filter((_, i) => i !== idx) });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
      {/* Header question */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
          Q{exIdx + 1}.{qIdx + 1}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <input
            type="number"
            value={q.points}
            onChange={(e) => onUpdate({ ...q, points: Math.max(0, Number(e.target.value)) })}
            min="0" step="0.5"
            className="w-14 rounded border border-gray-200 bg-white px-2 py-1 text-center text-sm outline-none focus:border-indigo-300"
          />
          <span className="text-xs text-gray-400">pts</span>
          <button type="button" onClick={onRemove} className="ml-1 rounded p-1 text-gray-300 hover:text-red-400">×</button>
        </div>
      </div>

      {/* Blocks */}
      {q.blocks.map((block, idx) => (
        <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
          <BlockEditor
            block={block}
            onChange={(b) => updateBlock(idx, b)}
            onRemove={() => removeBlock(idx)}
          />
        </div>
      ))}

      {/* Ajouter un bloc */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="text-xs text-gray-400 self-center">+ Bloc :</span>
        {(['text', 'image', 'table', 'qcm'] as BlockType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => addBlock(t)}
            className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${BLOCK_COLOR[t]}`}
          >
            {BLOCK_LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Main page ----------

export default function EvaluationCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<EvaluationForm>(emptyForm);
  const [exercices, setExercices] = useState<EvalExercice[]>([]);

  const { data: evaluation, isLoading: evalLoading } = useQuery<Evaluation>({
    queryKey: ['evaluation', id],
    queryFn: () => api.get(`/evaluations/${id}`).then((r) => r.data),
    enabled: isEdit,
  });
  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get('/courses').then((r) => r.data),
  });

  useEffect(() => {
    if (!evaluation) return;
    setForm({
      titre: evaluation.titre,
      bareme: String(evaluation.bareme),
      date: toDatetimeLocal(evaluation.date),
      courseIds: evaluation.courses.map((ec) => ec.courseId),
    });
    const c = evaluation.content as EvaluationContent | null;
    if (c?.exercices) setExercices(c.exercices);
  }, [evaluation]);

  // exercice helpers
  function addExercice() {
    setExercices((p) => [...p, { id: crypto.randomUUID(), titre: '', enonce: '', questions: [] }]);
  }
  function removeExercice(exId: string) {
    setExercices((p) => p.filter((e) => e.id !== exId));
  }
  function updateExercice(exId: string, patch: Partial<EvalExercice>) {
    setExercices((p) => p.map((e) => e.id === exId ? { ...e, ...patch } : e));
  }
  function moveExercice(idx: number, dir: 'up' | 'down') {
    const list = [...exercices];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    setExercices(list);
  }
  function addQuestion(exId: string) {
    setExercices((p) => p.map((e) =>
      e.id === exId ? { ...e, questions: [...e.questions, makeQuestion()] } : e
    ));
  }
  function removeQuestion(exId: string, qId: string) {
    setExercices((p) => p.map((e) =>
      e.id === exId ? { ...e, questions: e.questions.filter((q) => q.id !== qId) } : e
    ));
  }
  function updateQuestion(exId: string, q: EvalQuestion) {
    setExercices((p) => p.map((e) =>
      e.id === exId ? { ...e, questions: e.questions.map((old) => old.id === q.id ? q : old) } : e
    ));
  }

  const totalPoints = exercices.reduce((s, ex) => s + ex.questions.reduce((sq, q) => sq + q.points, 0), 0);
  const baremeOk = totalPoints === Number(form.bareme);

  const buildPayload = () => ({
    titre: form.titre.trim(),
    bareme: Number(form.bareme),
    date: form.date,
    content: { exercices } satisfies EvaluationContent,
    courseIds: form.courseIds,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/evaluations', buildPayload()),
    onSuccess: async (res) => { await queryClient.invalidateQueries({ queryKey: ['evaluations'] }); navigate(`/evaluations/${res.data.id}`); },
  });
  const updateMutation = useMutation({
    mutationFn: () => api.put(`/evaluations/${id}`, buildPayload()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      await queryClient.invalidateQueries({ queryKey: ['evaluation', id] });
      navigate(`/evaluations/${id}`);
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const canSubmit = form.titre.trim().length > 0 && Number(form.bareme) > 0 && form.date.length > 0 && !isSaving;
  const selectedCourses = courses.filter((c) => form.courseIds.includes(c.id));

  function update<K extends keyof EvaluationForm>(key: K, value: EvaluationForm[K]) {
    setForm((cur) => ({ ...cur, [key]: value }));
  }
  function toggleCourse(courseId: string) {
    setForm((cur) => ({
      ...cur,
      courseIds: cur.courseIds.includes(courseId)
        ? cur.courseIds.filter((cid) => cid !== courseId)
        : [...cur.courseIds, courseId],
    }));
  }
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  }

  if (evalLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <button type="button" onClick={() => navigate(isEdit && id ? `/evaluations/${id}` : '/evaluations')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <ArrowLeft size={16} /> Annuler
          </button>
          <button type="submit" form="evaluation-form" disabled={!canSubmit}
            className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <form id="evaluation-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Modifier le contrôle' : 'Nouveau contrôle'}</h1>
            <p className="mt-1 text-sm text-gray-500">Construisez le sujet bloc par bloc.</p>
          </div>

          <Section title="Informations">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Titre" required>
                <input value={form.titre} onChange={(e) => update('titre', e.target.value)} required autoFocus className={inputClass} placeholder="Ex: Contrôle chapitre 3" />
              </Field>
              <Field label="Barème" required>
                <input value={form.bareme} onChange={(e) => update('bareme', e.target.value)} type="number" min="1" step="0.5" required className={inputClass} />
              </Field>
              <Field label="Date" required>
                <input value={form.date} onChange={(e) => update('date', e.target.value)} type="datetime-local" required className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section title="Cours">
            {coursesLoading ? <div className="py-4 text-sm text-gray-400">Chargement...</div>
              : courses.length === 0 ? <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-400">Aucun cours disponible.</div>
              : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {courses.map((course) => (
                    <label key={course.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm hover:border-indigo-200 hover:bg-indigo-50/40">
                      <input type="checkbox" checked={form.courseIds.includes(course.id)} onChange={() => toggleCourse(course.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-700 focus:ring-indigo-500" />
                      <span>
                        <span className="block font-medium text-gray-900">{course.nom}</span>
                        <span className="text-xs text-gray-500">{course.matiere}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
          </Section>

          <Section title="Exercices">
            {exercices.length > 0 && (
              <div className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm ${baremeOk ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                <span>Total : <strong>{totalPoints} pts</strong></span>
                <span className="text-gray-300">—</span>
                <span>Barème : <strong>{form.bareme} pts</strong></span>
                {baremeOk ? <span className="font-semibold">✓</span> : <span>⚠ écart de {Math.abs(Number(form.bareme) - totalPoints)} pts</span>}
              </div>
            )}

            <div className="space-y-4">
              {exercices.map((ex, exIdx) => (
                <div key={ex.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2">
                    <span className="shrink-0 text-xs font-semibold uppercase text-gray-400">Exercice {exIdx + 1}</span>
                    <input value={ex.titre} onChange={(e) => updateExercice(ex.id, { titre: e.target.value })}
                      placeholder="Titre (optionnel)"
                      className="flex-1 bg-transparent text-sm font-semibold text-gray-800 placeholder-gray-300 outline-none" />
                    <span className="shrink-0 text-xs font-medium text-gray-400">
                      {ex.questions.reduce((s, q) => s + q.points, 0)} pts
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => moveExercice(exIdx, 'up')} disabled={exIdx === 0}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveExercice(exIdx, 'down')} disabled={exIdx === exercices.length - 1}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => removeExercice(ex.id)}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">×</button>
                    </div>
                  </div>

                  <div className="px-4 pt-3 pb-2">
                    <textarea value={ex.enonce} onChange={(e) => updateExercice(ex.id, { enonce: e.target.value })}
                      placeholder="Énoncé général, contexte de l'exercice…" rows={2}
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
                  </div>

                  <div className="space-y-2 px-4 pb-3">
                    {ex.questions.map((q, qIdx) => (
                      <QuestionEditor
                        key={q.id}
                        ex={ex}
                        q={q}
                        exIdx={exIdx}
                        qIdx={qIdx}
                        onUpdate={(updated) => updateQuestion(ex.id, updated)}
                        onRemove={() => removeQuestion(ex.id, q.id)}
                      />
                    ))}
                    <button type="button" onClick={() => addQuestion(ex.id)}
                      className="w-full rounded-lg border border-dashed border-gray-200 py-2 text-xs text-gray-400 hover:border-indigo-200 hover:text-indigo-500">
                      + Ajouter une question
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addExercice}
              className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600">
              + Ajouter un exercice
            </button>
          </Section>
        </form>

        <aside className="w-full lg:w-80">
          <div className="sticky top-24">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="h-2 bg-indigo-900" />
              <div className="p-5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <ClipboardList size={22} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{form.titre || 'Titre du contrôle'}</h2>
                <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Barème</span><span className="font-medium">{form.bareme} pts</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium text-right text-xs">{form.date ? new Date(form.date).toLocaleString('fr-FR') : '—'}</span></div>
                </div>
                {selectedCourses.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Cours</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCourses.map((c) => (
                        <span key={c.id} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{c.nom}</span>
                      ))}
                    </div>
                  </div>
                )}
                {exercices.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Exercices</div>
                    {exercices.map((ex, i) => (
                      <div key={ex.id} className="flex justify-between py-0.5 text-xs text-gray-600">
                        <span>Ex. {i + 1}{ex.titre ? ` — ${ex.titre}` : ''}</span>
                        <span className="text-gray-400">{ex.questions.reduce((s, q) => s + q.points, 0)} pts</span>
                      </div>
                    ))}
                    <div className={`mt-2 text-xs font-semibold ${baremeOk ? 'text-green-600' : 'text-amber-600'}`}>
                      Total : {totalPoints} / {form.bareme} pts
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
