import type { ShotPlan, UnifiedAsset } from "@/lib/types";

export type AssetSearchRequest = {
  shot: ShotPlan;
  perPage?: number;
};

export type AssetSearchResponse = {
  assets: UnifiedAsset[];
  warnings: string[];
};

export type AssetSource = {
  id: string;
  label: string;
  isConfigured: () => boolean;
  searchVideos: (request: AssetSearchRequest) => Promise<AssetSearchResponse>;
};
