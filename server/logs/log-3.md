===== Application Startup at 2026-07-07 14:06:31 =====

Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "teac", schema "public" at "ep-round-dawn-apz8l2ff.c-7.us-east-1.aws.neon.tech"

6 migrations found in prisma/migrations


No pending migrations to apply.
◇ injected env (0) from .env // tip: ⌘ suppress logs { quiet: true }
Server running on port 3001
PrismaClientKnownRequestError: 
Invalid `prisma_service_1.default.session.findFirst()` invocation in
/app/dist/controllers/session.controller.js:66:60

  63 exports.getSessions = getSessions;
  64 const getSession = async (req, res) => {
  65     const teacherId = req.userId;
→ 66     const session = await prisma_service_1.default.session.findFirst(
Can't reach database server at `ep-round-dawn-apz8l2ff-pooler.c-7.us-east-1.aws.neon.tech:5432`

Please make sure your database server is running at `ep-round-dawn-apz8l2ff-pooler.c-7.us-east-1.aws.neon.tech:5432`.
    at $n.handleRequestError (/app/node_modules/@prisma/client/runtime/library.js:121:7315)
    at $n.handleAndLogRequestError (/app/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/app/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/app/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async getSession (/app/dist/controllers/session.controller.js:66:21)
