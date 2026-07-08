-- Delete grades first (FK constraint), then evaluations
DELETE FROM "Grade";
DELETE FROM "Evaluation";

-- Drop old foreign key and column courseId
ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_courseId_fkey";
ALTER TABLE "Evaluation" DROP COLUMN "courseId";

-- Add new columns
ALTER TABLE "Evaluation" ADD COLUMN "content" JSONB;
ALTER TABLE "Evaluation" ADD COLUMN "teacherId" TEXT NOT NULL;
ALTER TABLE "Evaluation" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable EvaluationCourse
CREATE TABLE "EvaluationCourse" (
    "evaluationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    CONSTRAINT "EvaluationCourse_pkey" PRIMARY KEY ("evaluationId","courseId")
);

-- AddForeignKey Evaluation -> User
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey EvaluationCourse -> Evaluation
ALTER TABLE "EvaluationCourse" ADD CONSTRAINT "EvaluationCourse_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey EvaluationCourse -> Course
ALTER TABLE "EvaluationCourse" ADD CONSTRAINT "EvaluationCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
