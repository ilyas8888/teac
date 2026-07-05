import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, Calendar, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import type { DashboardSummary } from '../types';
import { useAuth } from '../store/AuthContext';

const StatCard = ({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number; color: string }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-sm text-gray-500 mt-1">{label}</div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
  });

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.prenom} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Classes" value={data?.classes || 0} color="bg-indigo-500" />
        <StatCard icon={Users} label="Élèves" value={data?.students || 0} color="bg-emerald-500" />
        <StatCard icon={Calendar} label="Séances cette semaine" value={data?.upcomingSessions.length || 0} color="bg-orange-500" />
        <StatCard icon={MessageSquare} label="Messages non lus" value={data?.unreadMessages || 0} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Clock size={18} className="text-indigo-500" /> Prochaines séances
          </h2>
          {data?.upcomingSessions.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune séance prévue cette semaine</p>
          ) : (
            <div className="space-y-3">
              {data?.upcomingSessions.map((s) => (
                <div key={s.id} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                  <div className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                    {format(new Date(s.date), 'dd/MM HH:mm')}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{s.titre}</div>
                    <div className="text-xs text-gray-500">{s.course?.nom} · {s.class?.nom}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-orange-500" /> Absences récentes
          </h2>
          {data?.recentAbsences.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune absence cette semaine</p>
          ) : (
            <div className="space-y-3">
              {data?.recentAbsences.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.justifiee ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {a.student?.prenom} {a.student?.nom}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(a.date), 'dd/MM/yyyy')} · {a.justifiee ? 'Justifiée' : 'Non justifiée'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
