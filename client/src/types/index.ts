export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  ecole?: string;
  matieres: string[];
}

export interface Class {
  id: string;
  nom: string;
  niveau: string;
  groupe?: string;
  etablissement?: string;
  annee: string;
  teacherId: string;
  _count?: { students: number };
}

export interface UserSettings {
  niveauxOptions: string[];
  groupesOptions: string[];
  etablissementsOptions: string[];
}

export interface Student {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  dateNaissance?: string;
  classId: string;
  class?: { nom: string; groupe?: string; etablissement?: string };
  _count?: { absences: number; grades: number };
}

export interface Course {
  id: string;
  nom: string;
  matiere: string;
  description?: string;
  niveau?: string | null;
  objectifsGeneraux?: string | null;
  prerequis?: string | null;
  nbHeures?: number | null;
  publicCible?: string | null;
  couleur?: string | null;
  image?: string | null;
  teacherId: string;
  modules?: Module[];
  _count?: { sessions: number; evaluations: number };
}

export interface Module {
  id: string;
  titre: string;
  ordre: number;
  image?: string | null;
  courseId: string;
  sessions?: Session[];
  createdAt?: string;
  _count?: { sessions: number };
}

export interface Session {
  id: string;
  titre: string;
  objectifs: string;
  contenu?: string;
  image?: string | null;
  duree: number;
  date: string;
  content?: unknown; // BlockNote document (array of blocks) stored as JSON
  courseId: string;
  classId: string;
  moduleId?: string | null;
  module?: { id: string; titre: string };
  course?: { nom: string; matiere?: string };
  class?: { nom: string; groupe?: string };
  resources?: Resource[];
  _count?: { resources: number };
}

export interface Resource {
  id: string;
  titre: string;
  type: 'PDF' | 'LIEN' | 'IMAGE' | 'VIDEO' | 'AUTRE';
  url?: string;
  fichier?: string;
  sessionId: string;
}

export interface Evaluation {
  id: string;
  titre: string;
  bareme: number;
  date: string;
  courseId: string;
  course?: { nom: string };
  _count?: { grades: number };
}

export interface Grade {
  id: string;
  note: number;
  commentaire?: string;
  studentId: string;
  evaluationId: string;
  student?: { id: string; nom: string; prenom: string };
}

export interface Absence {
  id: string;
  date: string;
  justifiee: boolean;
  motif?: string;
  studentId: string;
  sessionId?: string;
  student?: { nom: string; prenom: string };
  session?: { titre: string };
}

export interface Observation {
  id: string;
  contenu: string;
  date: string;
  studentId: string;
  teacherId: string;
}

export interface Message {
  id: string;
  sujet: string;
  corps: string;
  lu: boolean;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender?: { nom: string; prenom: string };
  receiver?: { nom: string; prenom: string };
}

export interface CalendarEvent {
  id: string;
  titre: string;
  type: 'SEANCE' | 'REUNION' | 'ECHEANCE' | 'PERSONNEL';
  debut: string;
  fin: string;
  description?: string;
  teacherId: string;
}

export interface DashboardSummary {
  classes: number;
  students: number;
  upcomingSessions: Session[];
  recentAbsences: Absence[];
  unreadMessages: number;
}
