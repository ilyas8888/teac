-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "couleur" TEXT,
ADD COLUMN     "nbHeures" INTEGER,
ADD COLUMN     "niveau" TEXT,
ADD COLUMN     "objectifsGeneraux" TEXT,
ADD COLUMN     "prerequis" TEXT,
ADD COLUMN     "publicCible" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "moduleId" TEXT;

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Module_courseId_idx" ON "Module"("courseId");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;
