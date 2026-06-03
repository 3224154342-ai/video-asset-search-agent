import type { AssetSearchRequest, AssetSearchResponse, AssetSource } from "./types";
import type { UnifiedAsset } from "@/lib/types";

type PexelsVideoFile = {
  id: number;
  quality?: string;
  file_type?: string;
  width?: number;
  height?: number;
  link: string;
};

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration?: number;
  url: string;
  image: string;
  user?: { name?: string; url?: string };
  video_files?: PexelsVideoFile[];
};

type PexelsSearchResponse = {
  videos?: PexelsVideo[];
};

export const pexelsSource: AssetSource = {
  id: "pexels",
  label: "Pexels",
  isConfigured: () => Boolean(process.env.PEXELS_API_KEY?.trim()),
  async searchVideos(request: AssetSearchRequest): Promise<AssetSearchResponse> {
    const apiKey = process.env.PEXELS_API_KEY?.trim();
    if (!apiKey) {
      return { assets: [], warnings: ["未配置 PEXELS_API_KEY，已跳过 Pexels。"] };
    }

    const query = buildQuery(request.shot.keywordsEn);
    const url = new URL("https://api.pexels.com/v1/videos/search");
    url.searchParams.set("query", query);
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("size", "medium");
    url.searchParams.set("locale", "en-US");
    url.searchParams.set("per_page", String(request.perPage ?? 8));

    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return {
        assets: [],
        warnings: [`Pexels 搜索失败：${response.status} ${response.statusText}`],
      };
    }

    const data = (await response.json()) as PexelsSearchResponse;
    const assets = (data.videos ?? [])
      .map((video): UnifiedAsset | null => {
        const bestFile = chooseBestFile(video.video_files ?? []);
        if (!bestFile) {
          return null;
        }

        return {
          sourcePlatform: "pexels",
          sourceAssetId: String(video.id),
          title: video.user?.name ? `Pexels video by ${video.user.name}` : "Pexels video",
          thumbnailUrl: video.image,
          previewUrl: bestFile.link,
          downloadUrl: bestFile.link,
          sourcePageUrl: video.url,
          licenseName: "Pexels License",
          licenseUrl: "https://www.pexels.com/license/",
          width: bestFile.width || video.width,
          height: bestFile.height || video.height,
          durationSec: video.duration,
          tags: request.shot.keywordsEn,
          raw: video,
        };
      })
      .filter((asset): asset is UnifiedAsset => Boolean(asset));

    return { assets, warnings: [] };
  },
};

function chooseBestFile(files: PexelsVideoFile[]): PexelsVideoFile | undefined {
  return files
    .filter((file) => file.link && (!file.file_type || file.file_type.includes("mp4")))
    .sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))[0];
}

function buildQuery(keywords: string[]): string {
  return keywords.join(" ").slice(0, 100) || "business technology";
}
