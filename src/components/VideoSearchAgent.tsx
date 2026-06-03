"use client";

import {
  Bookmark,
  CheckCircle2,
  Clapperboard,
  Download,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  LoaderCircle,
  Search,
  Star,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { AssetDto, ProjectDto } from "@/lib/types";

type CreateProjectResponse = {
  project?: ProjectDto;
  warnings?: string[];
  error?: string;
};

const sampleScript =
  "我们正在发布一款面向中小企业的智能运营平台，帮助团队把客户沟通、订单跟进和数据分析放在一个工作台里完成。视频需要表现企业从混乱协作到高效增长的转变，整体风格现代、可信、有科技感。";

export function VideoSearchAgent() {
  const [title, setTitle] = useState("");
  const [script, setScript] = useState(sampleScript);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const stats = useMemo(() => {
    const shots = project?.shots.length ?? 0;
    const assets = project?.shots.reduce((sum, shot) => sum + shot.assets.length, 0) ?? 0;
    const favorites =
      project?.shots.reduce(
        (sum, shot) => sum + shot.assets.filter((asset) => asset.isFavorite).length,
        0,
      ) ?? 0;
    return { shots, assets, favorites };
  }, [project]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setWarnings([]);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, script }),
      });
      const data = (await response.json()) as CreateProjectResponse;

      if (!response.ok || !data.project) {
        throw new Error(data.error || "生成失败。");
      }

      setProject(data.project);
      setWarnings(data.warnings ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleFavorite(asset: AssetDto) {
    const nextValue = !asset.isFavorite;
    setProject((current) => updateFavorite(current, asset.id, nextValue));

    try {
      const response = await fetch(`/api/assets/${asset.id}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: nextValue }),
      });

      if (!response.ok) {
        throw new Error("收藏保存失败。");
      }
    } catch {
      setProject((current) => updateFavorite(current, asset.id, asset.isFavorite));
      setError("收藏保存失败，请稍后重试。");
    }
  }

  const exportQuery = favoritesOnly ? "&favoritesOnly=true" : "";

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="control-panel">
          <div className="brand-row">
            <div className="brand-mark">
              <Clapperboard size={22} aria-hidden />
            </div>
            <div>
              <p className="eyebrow">Video Search Agent</p>
              <h1>视频素材搜索 Agent</h1>
            </div>
          </div>

          <form className="script-form" onSubmit={handleSubmit}>
            <label htmlFor="title">项目名</label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="可选"
            />

            <label htmlFor="script">项目介绍视频文案</label>
            <textarea
              id="script"
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={13}
            />

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <LoaderCircle className="spin" size={18} aria-hidden />
                ) : (
                  <Search size={18} aria-hidden />
                )}
                {isLoading ? "检索中" : "生成推荐"}
              </button>
              <button className="ghost-button" type="button" onClick={() => setScript(sampleScript)}>
                示例文案
              </button>
            </div>
          </form>

          {project ? (
            <div className="export-panel">
              <div className="metric-row">
                <Metric label="镜头" value={stats.shots} />
                <Metric label="素材" value={stats.assets} />
                <Metric label="收藏" value={stats.favorites} />
              </div>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(event) => setFavoritesOnly(event.target.checked)}
                />
                只导出收藏
              </label>

              <div className="export-actions">
                <a
                  className="secondary-button"
                  href={`/api/projects/${project.id}/export?format=csv${exportQuery}`}
                >
                  <FileSpreadsheet size={17} aria-hidden />
                  CSV
                </a>
                <a
                  className="secondary-button"
                  href={`/api/projects/${project.id}/export?format=json${exportQuery}`}
                >
                  <FileJson size={17} aria-hidden />
                  JSON
                </a>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="results-panel" aria-live="polite">
          <div className="results-header">
            <div>
              <p className="eyebrow">Storyboard Assets</p>
              <h2>{project?.title ?? "等待生成项目"}</h2>
            </div>
            {project ? (
              <div className="status-pill">
                <CheckCircle2 size={16} aria-hidden />
                已保存
              </div>
            ) : null}
          </div>

          {error ? <div className="alert error">{error}</div> : null}
          {warnings.length ? (
            <div className="alert">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          {!project && !isLoading ? (
            <div className="empty-state">
              <Bookmark size={26} aria-hidden />
              <p>输入文案后生成镜头与素材推荐。</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="loading-state">
              <LoaderCircle className="spin" size={28} aria-hidden />
              <p>拆解镜头并搜索素材...</p>
            </div>
          ) : null}

          {project ? (
            <div className="shot-list">
              {project.shots.map((shot) => (
                <section className="shot-section" key={shot.id}>
                  <div className="shot-heading">
                    <div className="shot-index">{shot.sequence}</div>
                    <div>
                      <h3>{shot.title}</h3>
                      <p>{shot.brief}</p>
                    </div>
                  </div>

                  <div className="shot-meta">
                    <Tag label="主体" value={shot.subject} />
                    <Tag label="动态" value={shot.motion} />
                    <Tag label="风格" value={shot.style} />
                    <Tag label="关键词" value={shot.keywordsEn.slice(0, 5).join(" / ")} />
                  </div>

                  {shot.assets.length ? (
                    <div className="asset-grid">
                      {shot.assets.map((asset) => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          onToggleFavorite={() => toggleFavorite(asset)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="shot-empty">暂无素材结果</div>
                  )}
                </section>
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-tag">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AssetCard({
  asset,
  onToggleFavorite,
}: {
  asset: AssetDto;
  onToggleFavorite: () => void;
}) {
  return (
    <article className="asset-card">
      <div className="thumb-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.thumbnailUrl} alt={asset.title ?? "video thumbnail"} loading="lazy" />
        <button
          className={asset.isFavorite ? "favorite-button active" : "favorite-button"}
          type="button"
          onClick={onToggleFavorite}
          title={asset.isFavorite ? "取消收藏" : "收藏素材"}
          aria-label={asset.isFavorite ? "取消收藏" : "收藏素材"}
        >
          <Star size={17} aria-hidden />
        </button>
      </div>

      <div className="asset-body">
        <div className="asset-topline">
          <span className="source-badge">{platformLabel(asset.sourcePlatform)}</span>
          <strong className="score">{asset.score.toFixed(1)}</strong>
        </div>
        <h4>{asset.title || "Untitled video"}</h4>
        <p>{asset.recommendationReason}</p>

        <div className="asset-specs">
          <span>
            {asset.width}x{asset.height}
          </span>
          <span>{asset.durationSec ? `${Math.round(asset.durationSec)}s` : "时长未知"}</span>
          <span>{asset.licenseName}</span>
        </div>

        <div className="asset-links">
          <a href={asset.sourcePageUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={15} aria-hidden />
            source
          </a>
          <a href={asset.downloadUrl} target="_blank" rel="noreferrer">
            <Download size={15} aria-hidden />
            download
          </a>
        </div>
      </div>
    </article>
  );
}

function updateFavorite(
  project: ProjectDto | null,
  assetId: string,
  isFavorite: boolean,
): ProjectDto | null {
  if (!project) {
    return project;
  }

  return {
    ...project,
    shots: project.shots.map((shot) => ({
      ...shot,
      assets: shot.assets.map((asset) =>
        asset.id === assetId ? { ...asset, isFavorite } : asset,
      ),
    })),
  };
}

function platformLabel(platform: string) {
  if (platform === "pexels") {
    return "Pexels";
  }
  if (platform === "pixabay") {
    return "Pixabay";
  }
  return platform;
}
