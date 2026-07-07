import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, BookOpen, Layers, ClipboardList, Trash2, Pencil, Search,
  GraduationCap, ArrowRight,
} from 'lucide-react';
import api from '../services/api';
import type { Course } from '../types';
import { courseTheme } from '../lib/courseTheme';

export default function CoursesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get('/courses').then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });

  const matieres = useMemo(
    () => Array.from(new Set(courses.map((c) => c.matiere))).sort(),
    [courses],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      c.nom.toLowerCase().includes(q) || c.matiere.toLowerCase().includes(q),
    );
  }, [courses, search]);

  const totalSessions = courses.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
  const totalEvals = courses.reduce((sum, c) => sum + (c._count?.evaluations || 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cours & Séances</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos cours, séances et ressources pédagogiques</p>
        </div>
        <button onClick={() => navigate('/courses/new')}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors">
          <Plus size={16} /> Nouveau cours
        </button>
      </div>

      {courses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<BookOpen size={18} />} value={courses.length} label="Cours" color="bg-indigo-100 text-indigo-700" />
          <StatCard icon={<Layers size={18} />} value={totalSessions} label="Séances" color="bg-emerald-100 text-emerald-700" />
          <StatCard icon={<ClipboardList size={18} />} value={totalEvals} label="Évaluations" color="bg-amber-100 text-amber-700" />
          <StatCard icon={<GraduationCap size={18} />} value={matieres.length} label="Matières" color="bg-rose-100 text-rose-700" />
        </div>
      )}

      {courses.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un cours ou une matière..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p className="mb-4">Aucun cours pour le moment.</p>
          <button onClick={() => navigate('/courses/new')}
            className="inline-flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800">
            <Plus size={16} /> Créer mon premier cours
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun résultat pour « {search} ».</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => {
            const theme = courseTheme(course.matiere);
            const accentStyle = course.couleur ? { backgroundColor: course.couleur } : undefined;
            return (
              <div key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer overflow-hidden">
                {course.image ? (
                  <div className="relative h-24 w-full overflow-hidden rounded-t-xl">
                    <img src={course.image} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
                  </div>
                ) : (
                  <div className={course.couleur ? 'h-1.5' : `h-1.5 bg-gradient-to-r ${theme.gradient}`} style={accentStyle} />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${course.couleur ? '' : theme.bg} p-2.5 rounded-lg`} style={course.couleur ? { backgroundColor: `${course.couleur}1A` } : undefined}>
                      <BookOpen size={18} className={course.couleur ? '' : theme.text} style={course.couleur ? { color: course.couleur } : undefined} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course.id}/edit`); }}
                        className="text-gray-400 hover:text-indigo-600 p-1 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm(`Supprimer le cours « ${course.nom} » ?`)) remove.mutate(course.id); }}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{course.nom}</h3>
                  <span className={`inline-block text-xs font-medium ${course.couleur ? '' : `${theme.text} ${theme.bg}`} px-2 py-0.5 rounded-full mb-3`}
                    style={course.couleur ? { color: course.couleur, backgroundColor: `${course.couleur}1A` } : undefined}>
                    {course.matiere}
                  </span>
                  {course.niveau && <p className="text-xs text-gray-500 mb-2">{course.niveau}</p>}
                  {course.description && <p className="text-xs text-gray-500 line-clamp-2 mb-4">{course.description}</p>}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Layers size={12} /> {course._count?.sessions || 0} séances</span>
                      <span className="flex items-center gap-1"><ClipboardList size={12} /> {course._count?.evaluations || 0} éval.</span>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
      <div>
        <div className="text-xl font-bold text-gray-900 leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
      </div>
    </div>
  );
}
