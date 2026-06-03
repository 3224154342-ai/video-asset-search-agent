import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toProjectDto } from "@/lib/projectDto";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  const favoritesOnly = request.nextUrl.searchParams.get("favoritesOnly") === "true";

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      shots: {
        orderBy: { sequence: "asc" },
        include: { assets: { orderBy: { score: "desc" } } },
      },
    },
  });

  if (!project) {
    return Response.json({ error: "项目不存在。" }, { status: 404 });
  }

  const dto = toProjectDto(project);
  const rows = dto.shots.flatMap((shot) =>
    shot.assets
      .filter((asset) => (favoritesOnly ? asset.isFavorite : true))
      .map((asset) => ({
        projectId: dto.id,
        projectTitle: dto.title,
        shotSequence: shot.sequence,
        shotTitle: shot.title,
        shotBrief: shot.brief,
        subject: shot.subject,
        motion: shot.motion,
        style: shot.style,
        keywordsZh: shot.keywordsZh.join(" / "),
        keywordsEn: shot.keywordsEn.join(" / "),
        assetId: asset.id,
        sourcePlatform: asset.sourcePlatform,
        sourceAssetId: asset.sourceAssetId,
        assetTitle: asset.title ?? "",
        score: asset.score,
        recommendationReason: asset.recommendationReason,
        width: asset.width,
        height: asset.height,
        durationSec: asset.durationSec ?? "",
        sourcePageUrl: asset.sourcePageUrl,
        downloadUrl: asset.downloadUrl,
        licenseName: asset.licenseName,
        licenseUrl: asset.licenseUrl ?? "",
        isFavorite: asset.isFavorite,
      })),
  );

  if (format === "json") {
    return Response.json({ project: dto, rows });
  }

  const csv = toCsv(rows);
  const encodedFilename = encodeURIComponent(`${safeFilename(dto.title) || "video"}-edit-list.csv`);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="video-edit-list.csv"; filename*=UTF-8''${encodedFilename}`,
    },
  });
}

function toCsv(rows: Record<string, string | number | boolean>[]): string {
  const headers = [
    "projectId",
    "projectTitle",
    "shotSequence",
    "shotTitle",
    "shotBrief",
    "subject",
    "motion",
    "style",
    "keywordsZh",
    "keywordsEn",
    "assetId",
    "sourcePlatform",
    "sourceAssetId",
    "assetTitle",
    "score",
    "recommendationReason",
    "width",
    "height",
    "durationSec",
    "sourcePageUrl",
    "downloadUrl",
    "licenseName",
    "licenseUrl",
    "isFavorite",
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(",")),
  ].join("\n");
}

function escapeCsv(value: string | number | boolean): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function safeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
