import { pexelsSource } from "./pexels";
import { pixabaySource } from "./pixabay";
import type { AssetSource } from "./types";
import type { ShotPlan, UnifiedAsset } from "@/lib/types";

const sources: AssetSource[] = [pexelsSource, pixabaySource];

export async function searchAssetsForShot(
  shot: ShotPlan,
  perPage = 8,
): Promise<{ assets: UnifiedAsset[]; warnings: string[] }> {
  const results = await Promise.allSettled(
    sources.map((source) => source.searchVideos({ shot, perPage })),
  );

  const assets: UnifiedAsset[] = [];
  const warnings: string[] = [];

  results.forEach((result, index) => {
    const source = sources[index];
    if (result.status === "fulfilled") {
      assets.push(...result.value.assets);
      warnings.push(...result.value.warnings);
      return;
    }

    warnings.push(`${source.label} 搜索异常：${result.reason}`);
  });

  return { assets, warnings: uniqueWarnings(warnings) };
}

export function getConfiguredSourceNames(): string[] {
  return sources.filter((source) => source.isConfigured()).map((source) => source.label);
}

function uniqueWarnings(warnings: string[]): string[] {
  return Array.from(new Set(warnings.filter(Boolean)));
}
