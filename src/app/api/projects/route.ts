import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchAssetsForShot } from "@/lib/asset-sources";
import { toJson } from "@/lib/json";
import { planShotsFromScript } from "@/lib/shotPlanner";
import { prisma } from "@/lib/prisma";
import { toProjectDto } from "@/lib/projectDto";
import { scoreAssets } from "@/lib/scoring";

export const runtime = "nodejs";

const createProjectSchema = z.object({
  title: z.string().trim().min(1).optional(),
  script: z.string().trim().min(10, "请至少输入 10 个字符的视频文案。"),
});

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: {
        select: { shots: true, assets: true },
      },
    },
  });

  return NextResponse.json({
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      createdAt: project.createdAt.toISOString(),
      shotCount: project._count.shots,
      assetCount: project._count.assets,
    })),
  });
}

export async function POST(request: NextRequest) {
  const parseResult = createProjectSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message ?? "请求参数无效。" },
      { status: 400 },
    );
  }

  const { script, title } = parseResult.data;
  const planned = await planShotsFromScript(script, title);

  const project = await prisma.project.create({
    data: {
      title: planned.title,
      script,
      shots: {
        create: planned.shots.map((shot) => ({
          sequence: shot.sequence,
          title: shot.title,
          brief: shot.brief,
          subject: shot.subject,
          motion: shot.motion,
          style: shot.style,
          keywordsZh: toJson(shot.keywordsZh),
          keywordsEn: toJson(shot.keywordsEn),
          forbiddenTypes: toJson(shot.forbiddenTypes),
          durationTargetSec: shot.durationTargetSec,
        })),
      },
    },
    include: { shots: true },
  });

  const warnings = [...planned.warnings];

  for (const shotRecord of project.shots.sort((a, b) => a.sequence - b.sequence)) {
    const shotPlan = planned.shots.find((shot) => shot.sequence === shotRecord.sequence);
    if (!shotPlan) {
      continue;
    }

    const searchResult = await searchAssetsForShot(shotPlan, 8);
    warnings.push(...searchResult.warnings);

    const scoredAssets = scoreAssets(searchResult.assets, shotPlan).slice(0, 8);
    for (const asset of scoredAssets) {
      const createdAsset = await prisma.asset.create({
        data: {
          projectId: project.id,
          shotId: shotRecord.id,
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
          matchedKeywords: toJson(asset.matchedKeywords),
          raw: toJson(asset.raw),
        },
      });

      await prisma.licenseRecord.create({
        data: {
          projectId: project.id,
          assetId: createdAsset.id,
          sourcePlatform: asset.sourcePlatform,
          sourceAssetId: asset.sourceAssetId,
          licenseName: asset.licenseName,
          licenseUrl: asset.licenseUrl,
          sourcePageUrl: asset.sourcePageUrl,
          termsSummary: buildLicenseSummary(asset.sourcePlatform),
          raw: toJson({
            licenseName: asset.licenseName,
            licenseUrl: asset.licenseUrl,
            sourcePageUrl: asset.sourcePageUrl,
          }),
        },
      });
    }
  }

  const fullProject = await prisma.project.findUniqueOrThrow({
    where: { id: project.id },
    include: {
      shots: {
        orderBy: { sequence: "asc" },
        include: {
          assets: {
            orderBy: { score: "desc" },
          },
        },
      },
    },
  });

  return NextResponse.json({
    project: toProjectDto(fullProject),
    warnings: uniqueWarnings(warnings),
  });
}

function buildLicenseSummary(platform: string): string {
  if (platform === "pexels") {
    return "Pexels License record captured from API result source page and license page.";
  }
  if (platform === "pixabay") {
    return "Pixabay Content License record captured from API result source page and license summary page.";
  }
  return "License metadata captured from provider response.";
}

function uniqueWarnings(warnings: string[]): string[] {
  return Array.from(new Set(warnings.filter(Boolean)));
}
