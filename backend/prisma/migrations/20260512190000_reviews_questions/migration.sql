-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "product_reviews_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answerUserId" TEXT,
    "answeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "product_questions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_questions_answerUserId_fkey" FOREIGN KEY ("answerUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_modelId_userId_key" ON "product_reviews"("modelId", "userId");

-- CreateIndex
CREATE INDEX "product_reviews_modelId_idx" ON "product_reviews"("modelId");

-- CreateIndex
CREATE INDEX "product_reviews_userId_idx" ON "product_reviews"("userId");

-- CreateIndex
CREATE INDEX "product_questions_modelId_idx" ON "product_questions"("modelId");

-- CreateIndex
CREATE INDEX "product_questions_userId_idx" ON "product_questions"("userId");

-- CreateIndex
CREATE INDEX "product_questions_answerUserId_idx" ON "product_questions"("answerUserId");
