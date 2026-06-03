import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toProjectDto } from "@/lib/projectDto";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
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
    return NextResponse.json({ error: "项目不存在。" }, { status: 404 });
  }

  return NextResponse.json({ project: toProjectDto(project) });
}
