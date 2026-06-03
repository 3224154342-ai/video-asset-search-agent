PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "script" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Shot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "brief" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "motion" TEXT NOT NULL,
  "style" TEXT NOT NULL,
  "keywordsZh" TEXT NOT NULL,
  "keywordsEn" TEXT NOT NULL,
  "forbiddenTypes" TEXT NOT NULL,
  "durationTargetSec" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Shot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Asset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "shotId" TEXT NOT NULL,
  "sourcePlatform" TEXT NOT NULL,
  "sourceAssetId" TEXT NOT NULL,
  "title" TEXT,
  "thumbnailUrl" TEXT NOT NULL,
  "previewUrl" TEXT,
  "downloadUrl" TEXT NOT NULL,
  "sourcePageUrl" TEXT NOT NULL,
  "licenseName" TEXT NOT NULL,
  "licenseUrl" TEXT,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "durationSec" REAL,
  "isHorizontal" BOOLEAN NOT NULL DEFAULT false,
  "score" REAL NOT NULL,
  "recommendationReason" TEXT NOT NULL,
  "matchedKeywords" TEXT NOT NULL,
  "raw" TEXT NOT NULL,
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Asset_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LicenseRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "assetId" TEXT,
  "sourcePlatform" TEXT NOT NULL,
  "sourceAssetId" TEXT NOT NULL,
  "licenseName" TEXT NOT NULL,
  "licenseUrl" TEXT,
  "sourcePageUrl" TEXT NOT NULL,
  "termsSummary" TEXT NOT NULL,
  "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "raw" TEXT,
  CONSTRAINT "LicenseRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LicenseRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Shot_projectId_sequence_idx" ON "Shot" ("projectId", "sequence");
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_shotId_sourcePlatform_sourceAssetId_key" ON "Asset" ("shotId", "sourcePlatform", "sourceAssetId");
CREATE INDEX IF NOT EXISTS "Asset_projectId_shotId_score_idx" ON "Asset" ("projectId", "shotId", "score");
CREATE UNIQUE INDEX IF NOT EXISTS "LicenseRecord_assetId_key" ON "LicenseRecord" ("assetId");
CREATE INDEX IF NOT EXISTS "LicenseRecord_projectId_sourcePlatform_idx" ON "LicenseRecord" ("projectId", "sourcePlatform");
