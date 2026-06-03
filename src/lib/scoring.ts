import { clamp } from "@/lib/json";
import type { ScoredAsset, ShotPlan, UnifiedAsset } from "@/lib/types";

const SOURCE_WEIGHT: Record<string, number> = {
  pexels: 0.94,
  pixabay: 0.9,
  adobe_stock: 0.96,
};

export function scoreAssets(assets: UnifiedAsset[], shot: ShotPlan): ScoredAsset[] {
  return assets
    .map((asset) => scoreAsset(asset, shot))
    .sort((a, b) => b.score - a.score);
}

function scoreAsset(asset: UnifiedAsset, shot: ShotPlan): ScoredAsset {
  const resolutionScore = scoreResolution(asset.width, asset.height);
  const ratioScore = scoreLandscapeRatio(asset.width, asset.height);
  const durationScore = scoreDuration(asset.durationSec, shot.durationTargetSec);
  const keywordResult = scoreKeywords(asset, shot);
  const sourceScore = SOURCE_WEIGHT[asset.sourcePlatform] ?? 0.82;
  const licenseScore = asset.licenseName && asset.licenseUrl ? 1 : 0.65;
  const forbiddenPenalty = scoreForbiddenPenalty(asset, shot);

  const rawScore =
    resolutionScore * 22 +
    ratioScore * 20 +
    durationScore * 16 +
    keywordResult.score * 22 +
    sourceScore * 10 +
    licenseScore * 10 -
    forbiddenPenalty;

  const score = Math.round(clamp(rawScore, 0, 100) * 10) / 10;
  const reasons = [
    `${asset.width}x${asset.height}`,
    ratioScore >= 0.85 ? "横屏比例匹配" : "画幅比例需复核",
    asset.durationSec ? `时长 ${Math.round(asset.durationSec)}s` : "时长未知",
    keywordResult.matched.length
      ? `命中 ${keywordResult.matched.slice(0, 3).join(", ")}`
      : "关键词弱匹配",
    `${platformLabel(asset.sourcePlatform)} 来源`,
    licenseScore === 1 ? "版权记录清晰" : "版权信息需复核",
  ];

  if (forbiddenPenalty > 0) {
    reasons.push("含禁用类型风险");
  }

  return {
    ...asset,
    isHorizontal: asset.width >= asset.height,
    score,
    matchedKeywords: keywordResult.matched,
    recommendationReason: reasons.join("；"),
  };
}

function scoreResolution(width: number, height: number): number {
  if (!width || !height) {
    return 0.35;
  }

  const pixels = width * height;
  const fullHd = 1920 * 1080;
  if (pixels >= 3840 * 2160) {
    return 1;
  }
  return clamp(pixels / fullHd, 0.35, 1);
}

function scoreLandscapeRatio(width: number, height: number): number {
  if (!width || !height) {
    return 0.4;
  }

  const ratio = width / height;
  const distanceFrom16x9 = Math.abs(ratio - 16 / 9);
  if (width < height) {
    return 0.1;
  }
  return clamp(1 - distanceFrom16x9 / 0.6, 0.25, 1);
}

function scoreDuration(durationSec?: number, targetSec?: number): number {
  if (!durationSec) {
    return 0.6;
  }

  const target = targetSec ?? 6;
  const distance = Math.abs(durationSec - target);
  if (durationSec < 3 || durationSec > 45) {
    return 0.45;
  }
  return clamp(1 - distance / 18, 0.5, 1);
}

function scoreKeywords(
  asset: UnifiedAsset,
  shot: ShotPlan,
): { score: number; matched: string[] } {
  const haystack = [
    asset.title,
    ...asset.tags,
    asset.sourcePlatform,
    asset.licenseName,
  ]
    .join(" ")
    .toLowerCase();
  const keywords = [...shot.keywordsEn, ...shot.keywordsZh]
    .map((keyword) => keyword.toLowerCase())
    .filter(Boolean);
  const matched = keywords.filter((keyword) => haystack.includes(keyword));

  if (!keywords.length) {
    return { score: 0.55, matched: [] };
  }

  return {
    score: clamp(matched.length / Math.min(keywords.length, 6), 0.25, 1),
    matched,
  };
}

function scoreForbiddenPenalty(asset: UnifiedAsset, shot: ShotPlan): number {
  const haystack = [asset.title, ...asset.tags].join(" ").toLowerCase();
  return shot.forbiddenTypes.some((type) => haystack.includes(type.toLowerCase()))
    ? 15
    : 0;
}

function platformLabel(platform: string): string {
  if (platform === "pexels") {
    return "Pexels";
  }
  if (platform === "pixabay") {
    return "Pixabay";
  }
  if (platform === "adobe_stock") {
    return "Adobe Stock";
  }
  return platform;
}
