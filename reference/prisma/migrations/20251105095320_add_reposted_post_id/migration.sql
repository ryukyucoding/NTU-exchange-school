-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "repostedPostId" TEXT;

-- CreateIndex
CREATE INDEX "Post_repostedPostId_idx" ON "Post"("repostedPostId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_repostedPostId_fkey" FOREIGN KEY ("repostedPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
