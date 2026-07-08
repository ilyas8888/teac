===== Application Startup at 2026-07-06 10:12:03 =====

Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "teac", schema "public" at "ep-round-dawn-apz8l2ff.c-7.us-east-1.aws.neon.tech"

3 migrations found in prisma/migrations


No pending migrations to apply.
┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
◇ injected env (0) from .env // tip: ◈ secrets for agents [www.dotenvx.com]
Server running on port 3001
PrismaClientValidationError: 
Invalid `prisma_service_1.default.student.createMany()` invocation in
/app/dist/controllers/student.controller.js:174:60

  171     res.status(400).json({ message: 'Aucun élève valide trouvé dans le fichier. Vérifiez les colonnes Nom, Prénom, Email.' });
  172     return;
  173 }
→ 174 const created = await prisma_service_1.default.student.createMany({
        data: [
          {
            nom: "Alaoui",
            prenom: "Youssef",
            email: "youssef.alaoui@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Benali",
            prenom: "Fatima",
            email: "fatima.benali@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Chraibi",
            prenom: "Omar",
            email: "omar.chraibi@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Drissi",
            prenom: "Salma",
            email: "salma.drissi@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "El Amrani",
            prenom: "Hamza",
            email: "hamza.elamrani@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Fassi",
            prenom: "Zineb",
            email: "zineb.fassi@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Ghazi",
            prenom: "Mehdi",
            email: "mehdi.ghazi@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Hassani",
            prenom: "Nadia",
            email: "nadia.hassani@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Idrissi",
            prenom: "Karim",
            email: "karim.idrissi@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Jalil",
            prenom: "Houda",
            email: "houda.jalil@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Kettani",
            prenom: "Amine",
            email: "amine.kettani@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Lahlou",
            prenom: "Meryem",
            email: "meryem.lahlou@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Mansouri",
            prenom: "Rachid",
            email: "rachid.mansouri@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Naciri",
            prenom: "Imane",
            email: "imane.naciri@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          },
          {
            nom: "Ouali",
            prenom: "Soufiane",
            email: "soufiane.ouali@etudiant.ma",
            classId: "522629a2-6048-4de3-bb13-bc692b86e646"
          }
        ],
        skipDuplicates: true
      })

Unknown argument `email`. Available options are marked with ?.
    at wn (/app/node_modules/@prisma/client/runtime/library.js:29:1363)
    at $n.handleRequestError (/app/node_modules/@prisma/client/runtime/library.js:121:6958)
    at $n.handleAndLogRequestError (/app/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/app/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/app/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async importStudentsFromExcel (/app/dist/controllers/student.controller.js:174:21)
