import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Inbox, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import type { Message } from '../types';

export default function MessagesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sujet: '', corps: '', receiverId: '' });

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['messages', tab],
    queryFn: () => api.get('/messages', { params: { type: tab === 'sent' ? 'sent' : undefined } }).then((r) => r.data),
  });

  const send = useMutation({
    mutationFn: (data: typeof form) => api.post('/messages', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setShowForm(false); setForm({ sujet: '', corps: '', receiverId: '' }); },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/messages/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/messages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800">
          <Send size={16} /> Nouveau message
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Nouveau message</h2>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destinataire (ID utilisateur)</label>
              <input value={form.receiverId} onChange={(e) => setForm({ ...form, receiverId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="UUID du destinataire" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
              <input value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea value={form.corps} onChange={(e) => setForm({ ...form, corps: e.target.value })} rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => send.mutate(form)} disabled={!form.sujet || !form.corps || !form.receiverId || send.isPending}
              className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
              {send.isPending ? 'Envoi...' : 'Envoyer'}
            </button>
            <button onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Annuler</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        <button onClick={() => setTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'inbox' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
          <Inbox size={16} /> Reçus
        </button>
        <button onClick={() => setTab('sent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'sent' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
          <Send size={16} /> Envoyés
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucun message</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {messages.map((m) => (
            <div key={m.id}
              className={`flex items-start gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!m.lu && tab === 'inbox' ? 'bg-indigo-50' : ''}`}
              onClick={() => !m.lu && tab === 'inbox' && markRead.mutate(m.id)}>
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!m.lu && tab === 'inbox' ? 'bg-indigo-500' : 'bg-transparent'}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${!m.lu ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{m.sujet}</span>
                  <span className="text-xs text-gray-400">{format(new Date(m.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {tab === 'inbox' ? `De : ${m.sender?.prenom} ${m.sender?.nom}` : `À : ${m.receiver?.prenom} ${m.receiver?.nom}`}
                </div>
                <div className="text-sm text-gray-600 mt-1 line-clamp-1">{m.corps}</div>
              </div>
              {tab === 'sent' && (
                <button onClick={(e) => { e.stopPropagation(); remove.mutate(m.id); }} className="text-gray-400 hover:text-red-500 mt-1">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
