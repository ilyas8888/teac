import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus } from 'lucide-react';
import api from '../services/api';
import type { CalendarEvent } from '../types';

const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { locale: fr }), getDay, locales: { fr } });

const eventColors: Record<string, string> = {
  SEANCE: '#4f46e5',
  REUNION: '#059669',
  ECHEANCE: '#dc2626',
  PERSONNEL: '#d97706',
};

export default function CalendarPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: '', type: 'SEANCE', debut: '', fin: '', description: '' });

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/events', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); setShowForm(false); setForm({ titre: '', type: 'SEANCE', debut: '', fin: '', description: '' }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });

  const calEvents = useMemo(() => events.map((e) => ({
    id: e.id,
    title: e.titre,
    start: new Date(e.debut),
    end: new Date(e.fin),
    resource: e.type,
  })), [events]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800">
          <Plus size={16} /> Ajouter un événement
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        {Object.entries(eventColors).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {type === 'SEANCE' ? 'Séance' : type === 'REUNION' ? 'Réunion' : type === 'ECHEANCE' ? 'Échéance' : 'Personnel'}
          </span>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Nouvel événement</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="SEANCE">Séance</option>
                <option value="REUNION">Réunion</option>
                <option value="ECHEANCE">Échéance</option>
                <option value="PERSONNEL">Personnel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
              <input type="datetime-local" value={form.debut} onChange={(e) => setForm({ ...form, debut: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
              <input type="datetime-local" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => create.mutate(form)} disabled={!form.titre || !form.debut || !form.fin || create.isPending}
              className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
              {create.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Annuler</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6" style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={calEvents}
          defaultView="month"
          views={['month', 'week', 'day']}
          messages={{ next: 'Suivant', previous: 'Précédent', today: "Aujourd'hui", month: 'Mois', week: 'Semaine', day: 'Jour', noEventsInRange: 'Aucun événement' }}
          eventPropGetter={(event) => ({
            style: { backgroundColor: eventColors[event.resource as string] || '#4f46e5', border: 'none', borderRadius: '4px' }
          })}
          onSelectEvent={(event) => { if (window.confirm(`Supprimer "${event.title}" ?`)) remove.mutate(event.id as string); }}
        />
      </div>
    </div>
  );
}
