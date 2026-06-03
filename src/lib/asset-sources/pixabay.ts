import type { AssetSearchRequest, AssetSearchResponse, AssetSource } from "./types";
import type { UnifiedAsset } from "@/lib/types";

type PixabayVideoRendition = {
  url?: string;
  width?: number;
  height?: number;
  size?: number;
  thumbnail?: string;
};

type PixabayVideoHit = {
  id: number;
  pageURL: string;
  type?: string;
  tags?: string;
  duration?: number;
  videos?: Record<string, PixabayVideoRendition>;
  user?: string;
};

type PixabaySearchResponse = {
  hits?: PixabayVideoHit[];
};

export const pixabaySource: AssetSource = {
  id: "pixabay",
  label: "Pixabay",
  isConfigured: () => Boolean(process.env.PIXABAY_API_KEY?.trim()),
  async searchVideos(request: AssetSearchRequest): Promise<AssetSearchResponse> {
    const apiKey = process.env.PIXABAY_API_KEY?.trim();
    if (!apiKey) {
      return { assets: [], warnings: ["未配置 PIXABAY_API_KEY，已跳过 Pixabay。"] };
    }

    const query = buildQuery(request.shot.keywordsEn);
    const url = new URL("https://pixabay.com/api/videos/");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", query);
    url.searchParams.set("lang", "en");
    url.searchParams.set("video_type", "film");
    url.searchParams.set("min_width", "1280");
    url.searchParams.set("min_height", "720");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("order", "popular");
    url.searchParams.set("per_page", String(request.perPage ?? 8));

    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });

    if (!response.ok) {
      return {
        assets: [],
        warnings: [`Pixabay 搜索失败：${response.status} ${response.statusText}`],
      };
    }

    const data = (await response.json()) as PixabaySearchResponse;
    const assets = (data.hits ?? [])
      .map((hit): UnifiedAsset | null => {
        const bestVideo = chooseBestRendition(hit.videos ?? {});
        if (!bestVideo?.url || !bestVideo.thumbnail) {
          return null;
        }

        const tags = (hit.tags ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);

        return {
          sourcePlatform: "pixabay",
          sourceAssetId: String(hit.id),
          title: tags.length ? tags.join(", ") : "Pixabay video",
          thumbnailUrl: bestVideo.thumbnail,
          previewUrl: bestVideo.url,
          downloadUrl: `${bestVideo.url}${bestVideo.url.includes("?") ? "&" : "?"}download=1`,
          sourcePageUrl: hit.pageURL,
          licenseName: "Pixabay Content License",
          licenseUrl: "https://pixabay.com/service/license-summary/",
          width: bestVideo.width ?? 0,
          height: bestVideo.height ?? 0,
          durationSec: hit.duration,
          tags: [...tags, hit.type ?? ""].filter(Boolean),
          raw: hit,
        };
      })
      .filter((asset): asset is UnifiedAsset => Boolean(asset));

    return { assets, warnings: [] };
  },
};

function chooseBestRendition(
  videos: Record<string, PixabayVideoRendition>,
): PixabayVideoRendition | undefined {
  return ["large", "medium", "small", "tiny"]
    .map((size) => videos[size])
    .filter((rendition): rendition is PixabayVideoRendition =>
      Boolean(rendition?.url && rendition.width && rendition.height),
    )[0];
}

function buildQuery(keywords: string[]): string {
  return keywords.join(" ").slice(0, 100) || "business technology";
}
