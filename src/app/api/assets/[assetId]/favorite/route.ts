import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const favoriteSchema = z.object({
  isFavorite: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  const parseResult = favoriteSchema.safeParse(await request.json());

  if (!parseResult.success) {
    return NextResponse.json({ error: "收藏状态无效。" }, { status: 400 });
  }

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: { isFavorite: parseResult.data.isFavorite },
    select: { id: true, isFavorite: true },
  });

  return NextResponse.json({ asset });
}
