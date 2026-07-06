import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, ClipboardList,
  MessageSquare, Calendar, Sparkles, LogOut, GraduationCap, School
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

const nav = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/classes', label: 'Classes', icon: School },
  { to: '/courses', label: 'Cours & Séances', icon: BookOpen },
  { to: '/students', label: 'Élèves', icon: Users },
  { to: '/evaluations', label: 'Évaluations', icon: ClipboardList },
  { to: '/ai-assistant', label: 'Assistant IA', icon: Sparkles },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/calendar', label: 'Calendrier', icon: Calendar },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-indigo-900 text-white flex flex-col min-h-screen">
      <div className="p-6 flex items-center gap-3 border-b border-indigo-800">
        <GraduationCap size={28} className="text-indigo-300" />
        <span className="text-xl font-bold tracking-wide">Teac</span>
      </div>

      <nav className="flex-1 py-4">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-700 text-white'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-indigo-800">
        <div className="text-xs text-indigo-300 mb-1">{user?.prenom} {user?.nom}</div>
        <div className="text-xs text-indigo-400 mb-3 truncate">{user?.email}</div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-indigo-300 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
