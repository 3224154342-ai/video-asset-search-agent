export type SourcePlatform = "pexels" | "pixabay" | "adobe_stock";

export type ShotPlan = {
  sequence: number;
  title: string;
  brief: string;
  subject: string;
  motion: string;
  style: string;
  keywordsZh: string[];
  keywordsEn: string[];
  forbiddenTypes: string[];
  durationTargetSec?: number;
};

export type UnifiedAsset = {
  sourcePlatform: SourcePlatform;
  sourceAssetId: string;
  title?: string;
  thumbnailUrl: string;
  previewUrl?: string;
  downloadUrl: string;
  sourcePageUrl: string;
  licenseName: string;
  licenseUrl?: string;
  width: number;
  height: number;
  durationSec?: number;
  tags: string[];
  raw: unknown;
};

export type ScoredAsset = UnifiedAsset & {
  isHorizontal: boolean;
  score: number;
  recommendationReason: string;
  matchedKeywords: string[];
};

export type ProviderSearchResult = {
  assets: UnifiedAsset[];
  warnings: string[];
};

export type ProjectDto = {
  id: string;
  title: string;
  script: string;
  createdAt: string;
  updatedAt: string;
  shots: ShotDto[];
};

export type ShotDto = ShotPlan & {
  id: string;
  projectId: string;
  createdAt: string;
  assets: AssetDto[];
};

export type AssetDto = {
  id: string;
  projectId: string;
  shotId: string;
  sourcePlatform: string;
  sourceAssetId: string;
  title?: string | null;
  thumbnailUrl: string;
  previewUrl?: string | null;
  downloadUrl: string;
  sourcePageUrl: string;
  licenseName: string;
  licenseUrl?: string | null;
  width: number;
  height: number;
  durationSec?: number | null;
  isHorizontal: boolean;
  score: number;
  recommendationReason: string;
  matchedKeywords: string[];
  isFavorite: boolean;
  createdAt: string;
};
