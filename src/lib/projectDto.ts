import { parseJsonArray } from "@/lib/json";
import type { AssetDto, ProjectDto, ShotDto } from "@/lib/types";

type AssetRecord = {
  id: string;
  projectId: string;
  shotId: string;
  sourcePlatform: string;
  sourceAssetId: string;
  title: string | null;
  thumbnailUrl: string;
  previewUrl: string | null;
  downloadUrl: string;
  sourcePageUrl: string;
  licenseName: string;
  licenseUrl: string | null;
  width: number;
  height: number;
  durationSec: number | null;
  isHorizontal: boolean;
  score: number;
  recommendationReason: string;
  matchedKeywords: string;
  isFavorite: boolean;
  createdAt: Date;
};

type ShotRecord = {
  id: string;
  projectId: string;
  sequence: number;
  title: string;
  brief: string;
  subject: string;
  motion: string;
  style: string;
  keywordsZh: string;
  keywordsEn: string;
  forbiddenTypes: string;
  durationTargetSec: number | null;
  createdAt: Date;
  assets: AssetRecord[];
};

type ProjectRecord = {
  id: string;
  title: string;
  script: string;
  createdAt: Date;
  updatedAt: Date;
  shots: ShotRecord[];
};

export function toProjectDto(project: ProjectRecord): ProjectDto {
  return {
    id: project.id,
    title: project.title,
    script: project.script,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    shots: project.shots
      .sort((a, b) => a.sequence - b.sequence)
      .map((shot) => toShotDto(shot)),
  };
}

function toShotDto(shot: ShotRecord): ShotDto {
  return {
    id: shot.id,
    projectId: shot.projectId,
    sequence: shot.sequence,
    title: shot.title,
    brief: shot.brief,
    subject: shot.subject,
    motion: shot.motion,
    style: shot.style,
    keywordsZh: parseJsonArray(shot.keywordsZh),
    keywordsEn: parseJsonArray(shot.keywordsEn),
    forbiddenTypes: parseJsonArray(shot.forbiddenTypes),
    durationTargetSec: shot.durationTargetSec ?? undefined,
    createdAt: shot.createdAt.toISOString(),
    assets: shot.assets.sort((a, b) => b.score - a.score).map((asset) => toAssetDto(asset)),
  };
}

function toAssetDto(asset: AssetRecord): AssetDto {
  return {
    id: asset.id,
    projectId: asset.projectId,
    shotId: asset.shotId,
    sourcePlatform: asset.sourcePlatform,
    sourceAssetId: asset.sourceAssetId,
    title: asset.title,
    thumbnailUrl: asset.thumbnailUrl,
    previewUrl: asset.previewUrl,
    downloadUrl: asset.downloadUrl,
    sourcePageUrl: asset.sourcePageUrl,
    licenseName: asset.licenseName,
    licenseUrl: asset.licenseUrl,
    width: asset.width,
    height: asset.height,
    durationSec: asset.durationSec,
    isHorizontal: asset.isHorizontal,
    score: asset.score,
    recommendationReason: asset.recommendationReason,
    matchedKeywords: parseJsonArray(asset.matchedKeywords),
    isFavorite: asset.isFavorite,
    createdAt: asset.createdAt.toISOString(),
  };
}
