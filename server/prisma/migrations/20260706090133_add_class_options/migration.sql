-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "etablissement" TEXT,
ADD COLUMN     "groupe" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "etablissementsOptions" TEXT[],
ADD COLUMN     "groupesOptions" TEXT[],
ADD COLUMN     "niveauxOptions" TEXT[];
