import bcrypt from 'bcryptjs';
import prisma from './services/prisma.service';

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const teacher = await prisma.user.upsert({
    where: { email: 'demo@teac.app' },
    update: {},
    create: {
      nom: 'admin',
      prenom: 'admin',
      email: 'admin@teac.app',
      passwordHash: passwordHash,
      ecole: 'ISTA Hay Riad',
      matieres: ['Développement Web', 'Base de données', 'Algorithmique'],
    },
  });

  const classeTSI = await prisma.class.upsert({
    where: { id: 'class-tsi-1' },
    update: {},
    create: {
      id: 'class-tsi-1',
      nom: 'TSI 1',
      niveau: 'Technicien Spécialisé',
      annee: '2025-2026',
      teacherId: teacher.id,
    },
  });

  const classeDEV = await prisma.class.upsert({
    where: { id: 'class-dev-2' },
    update: {},
    create: {
      id: 'class-dev-2',
      nom: 'DEV 2',
      niveau: 'Technicien Spécialisé',
      annee: '2025-2026',
      teacherId: teacher.id,
    },
  });

  const studentsData = [
    { id: 'stu-1', nom: 'Alaoui', prenom: 'Youssef', email: 'parent1@gmail.com', classId: classeTSI.id },
    { id: 'stu-2', nom: 'Benali', prenom: 'Fatima', email: 'parent2@gmail.com', classId: classeTSI.id },
    { id: 'stu-3', nom: 'Chraibi', prenom: 'Omar', email: 'parent3@gmail.com', classId: classeTSI.id },
    { id: 'stu-4', nom: 'Daoudi', prenom: 'Nadia', email: 'parent4@gmail.com', classId: classeTSI.id },
    { id: 'stu-5', nom: 'El Fassi', prenom: 'Mehdi', email: 'parent5@gmail.com', classId: classeTSI.id },
    { id: 'stu-6', nom: 'Filali', prenom: 'Sara', email: 'parent6@gmail.com', classId: classeTSI.id },
    { id: 'stu-7', nom: 'Ghazi', prenom: 'Amine', email: 'parent7@gmail.com', classId: classeDEV.id },
    { id: 'stu-8', nom: 'Hamdani', prenom: 'Layla', email: 'parent8@gmail.com', classId: classeDEV.id },
    { id: 'stu-9', nom: 'Idrissi', prenom: 'Karim', email: 'parent9@gmail.com', classId: classeDEV.id },
    { id: 'stu-10', nom: 'Jamai', prenom: 'Zineb', email: 'parent10@gmail.com', classId: classeDEV.id },
  ];

  const students: Record<string, { id: string }> = {};
  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
    students[s.id] = student;
  }

  const courseWeb = await prisma.course.upsert({
    where: { id: 'course-web-1' },
    update: {},
    create: {
      id: 'course-web-1',
      nom: 'Développement Web',
      matiere: 'HTML/CSS/JavaScript',
      description: 'Introduction au développement web front-end : HTML5, CSS3, JavaScript ES6+',
      teacherId: teacher.id,
    },
  });

  const courseDB = await prisma.course.upsert({
    where: { id: 'course-db-1' },
    update: {},
    create: {
      id: 'course-db-1',
      nom: 'Base de données',
      matiere: 'SQL / PostgreSQL',
      description: 'Modélisation, SQL, normalisation et optimisation des bases de données relationnelles',
      teacherId: teacher.id,
    },
  });

  const sessionsData = [
    {
      id: 'sess-1',
      titre: 'Introduction à HTML5',
      objectifs: 'Comprendre la structure d\'une page HTML, les balises sémantiques',
      contenu: 'Structure de base, balises de titre, paragraphes, listes, liens, images',
      duree: 120,
      date: new Date('2026-01-10T08:00:00'),
      courseId: courseWeb.id,
      classId: classeTSI.id,
    },
    {
      id: 'sess-2',
      titre: 'CSS3 et Flexbox',
      objectifs: 'Maîtriser le positionnement et la mise en page avec Flexbox',
      contenu: 'Sélecteurs CSS, box model, Flexbox, media queries',
      duree: 120,
      date: new Date('2026-01-17T08:00:00'),
      courseId: courseWeb.id,
      classId: classeTSI.id,
    },
    {
      id: 'sess-3',
      titre: 'JavaScript ES6 — Variables et fonctions',
      objectifs: 'Comprendre les bases de JavaScript moderne',
      contenu: 'let/const, arrow functions, template literals, destructuring',
      duree: 120,
      date: new Date('2026-01-24T08:00:00'),
      courseId: courseWeb.id,
      classId: classeTSI.id,
    },
    {
      id: 'sess-4',
      titre: 'Modélisation entité-association',
      objectifs: 'Concevoir un schéma de base de données',
      contenu: 'Entités, associations, cardinalités, passage au modèle relationnel',
      duree: 120,
      date: new Date('2026-01-15T10:00:00'),
      courseId: courseDB.id,
      classId: classeDEV.id,
    },
    {
      id: 'sess-5',
      titre: 'SQL — SELECT et jointures',
      objectifs: 'Écrire des requêtes SQL de base et des jointures',
      contenu: 'SELECT, WHERE, ORDER BY, GROUP BY, INNER JOIN, LEFT JOIN',
      duree: 120,
      date: new Date('2026-01-22T10:00:00'),
      courseId: courseDB.id,
      classId: classeDEV.id,
    },
  ];

  for (const s of sessionsData) {
    await prisma.session.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  const evalWeb = await prisma.evaluation.upsert({
    where: { id: 'eval-web-1' },
    update: {},
    create: {
      id: 'eval-web-1',
      titre: 'Contrôle HTML/CSS',
      bareme: 20,
      date: new Date('2026-02-07T08:00:00'),
      courseId: courseWeb.id,
    },
  });

  const evalDB = await prisma.evaluation.upsert({
    where: { id: 'eval-db-1' },
    update: {},
    create: {
      id: 'eval-db-1',
      titre: 'Examen SQL',
      bareme: 20,
      date: new Date('2026-02-14T10:00:00'),
      courseId: courseDB.id,
    },
  });

  const gradesWeb = [
    { id: 'grade-1', note: 16.5, studentId: 'stu-1', evaluationId: evalWeb.id },
    { id: 'grade-2', note: 14.0, studentId: 'stu-2', evaluationId: evalWeb.id },
    { id: 'grade-3', note: 11.5, studentId: 'stu-3', evaluationId: evalWeb.id },
    { id: 'grade-4', note: 18.0, studentId: 'stu-4', evaluationId: evalWeb.id },
    { id: 'grade-5', note: 9.0, studentId: 'stu-5', evaluationId: evalWeb.id },
    { id: 'grade-6', note: 15.5, studentId: 'stu-6', evaluationId: evalWeb.id },
  ];

  const gradesDB = [
    { id: 'grade-7', note: 13.0, studentId: 'stu-7', evaluationId: evalDB.id },
    { id: 'grade-8', note: 17.5, studentId: 'stu-8', evaluationId: evalDB.id },
    { id: 'grade-9', note: 10.0, studentId: 'stu-9', evaluationId: evalDB.id },
    { id: 'grade-10', note: 15.0, studentId: 'stu-10', evaluationId: evalDB.id },
  ];

  for (const g of [...gradesWeb, ...gradesDB]) {
    await prisma.grade.upsert({ where: { id: g.id }, update: {}, create: g });
  }

  const absencesData = [
    { id: 'abs-1', date: new Date('2026-01-17'), justifiee: false, studentId: 'stu-3', sessionId: 'sess-2' },
    { id: 'abs-2', date: new Date('2026-01-24'), justifiee: true, studentId: 'stu-5', sessionId: 'sess-3' },
    { id: 'abs-3', date: new Date('2026-01-22'), justifiee: false, studentId: 'stu-9', sessionId: 'sess-5' },
  ];

  for (const a of absencesData) {
    await prisma.absence.upsert({ where: { id: a.id }, update: {}, create: a });
  }

  const observationsData = [
    {
      id: 'obs-1',
      contenu: 'Élève très sérieux, participation active en cours. Doit travailler la gestion du temps en contrôle.',
      date: new Date('2026-02-08'),
      studentId: 'stu-1',
      teacherId: teacher.id,
    },
    {
      id: 'obs-2',
      contenu: 'Difficultés sur les sélecteurs CSS. Exercices supplémentaires recommandés.',
      date: new Date('2026-01-20'),
      studentId: 'stu-5',
      teacherId: teacher.id,
    },
    {
      id: 'obs-3',
      contenu: 'Excellent niveau en modélisation. Peut aider ses camarades.',
      date: new Date('2026-01-23'),
      studentId: 'stu-8',
      teacherId: teacher.id,
    },
  ];

  for (const o of observationsData) {
    await prisma.observation.upsert({ where: { id: o.id }, update: {}, create: o });
  }

  const eventsData = [
    {
      id: 'evt-1',
      titre: 'Séance HTML5 — TSI 1',
      type: 'SEANCE' as const,
      debut: new Date('2026-07-10T08:00:00'),
      fin: new Date('2026-07-10T10:00:00'),
      description: 'Introduction aux formulaires HTML5',
      teacherId: teacher.id,
    },
    {
      id: 'evt-2',
      titre: 'Réunion pédagogique',
      type: 'REUNION' as const,
      debut: new Date('2026-07-11T14:00:00'),
      fin: new Date('2026-07-11T16:00:00'),
      description: 'Réunion mensuelle de l\'équipe pédagogique',
      teacherId: teacher.id,
    },
    {
      id: 'evt-3',
      titre: 'Remise des notes — DEV 2',
      type: 'ECHEANCE' as const,
      debut: new Date('2026-07-15T08:00:00'),
      fin: new Date('2026-07-15T09:00:00'),
      description: 'Date limite de saisie des notes du semestre',
      teacherId: teacher.id,
    },
    {
      id: 'evt-4',
      titre: 'Séance SQL avancé — DEV 2',
      type: 'SEANCE' as const,
      debut: new Date('2026-07-14T10:00:00'),
      fin: new Date('2026-07-14T12:00:00'),
      description: 'Sous-requêtes et optimisation',
      teacherId: teacher.id,
    },
  ];

  for (const e of eventsData) {
    await prisma.event.upsert({ where: { id: e.id }, update: {}, create: e });
  }

  console.log('✅ Seed terminé.');
  console.log('   Compte démo : demo@teac.app / demo1234');
  console.log(`   Enseignant  : ${teacher.prenom} ${teacher.nom}`);
  console.log(`   Classes     : TSI 1 (6 élèves), DEV 2 (4 élèves)`);
  console.log(`   Cours       : Développement Web, Base de données`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
