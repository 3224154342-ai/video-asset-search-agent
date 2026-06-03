# 视频素材搜索 Agent

Next.js + TypeScript + Prisma + SQLite 的最小可用原型，用于把项目介绍视频文案拆成镜头需求，并从 Pexels / Pixabay 搜索视频素材、统一打分、收藏和导出剪辑清单。

## 快速启动

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

本地地址：`http://127.0.0.1:3000`

## 环境变量

复制 `.env.example` 为 `.env` 后填入：

```bash
DATABASE_URL="file:./prisma/dev.db"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
PEXELS_API_KEY=""
PIXABAY_API_KEY=""
```

没有 `OPENAI_API_KEY` 时，系统会使用本地规则生成镜头。没有素材站 API key 时，对应平台会跳过并返回提醒。

## 核心结构

- `src/lib/shotPlanner.ts`：LLM 拆镜，含本地 fallback。
- `src/lib/asset-sources/`：素材站适配器，Pexels / Pixabay 已实现，Adobe Stock 占位。
- `src/lib/scoring.ts`：统一评分逻辑。
- `src/app/api/projects/route.ts`：创建项目、拆镜、搜索、保存资产。
- `src/app/api/assets/[assetId]/favorite/route.ts`：收藏素材。
- `src/app/api/projects/[projectId]/export/route.ts`：CSV / JSON 导出。
- `prisma/schema.prisma`：Project、Shot、Asset、LicenseRecord 四类数据。

## 扩展素材站

新增素材源时实现 `AssetSource`：

```ts
export const mySource: AssetSource = {
  id: "my_source",
  label: "My Source",
  isConfigured: () => Boolean(process.env.MY_SOURCE_API_KEY),
  async searchVideos({ shot, perPage }) {
    return { assets: [], warnings: [] };
  },
};
```

将返回结果映射为 `UnifiedAsset`，再加入 `src/lib/asset-sources/index.ts` 的 `sources` 数组即可复用现有评分、保存、收藏和导出流程。
