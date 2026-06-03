import OpenAI from "openai";
import { z } from "zod";
import type { ShotPlan } from "@/lib/types";

const shotSchema = z.object({
  sequence: z.number().int().positive(),
  title: z.string().min(1),
  brief: z.string().min(1),
  subject: z.string().min(1),
  motion: z.string().min(1),
  style: z.string().min(1),
  keywordsZh: z.array(z.string()).min(2),
  keywordsEn: z.array(z.string()).min(2),
  forbiddenTypes: z.array(z.string()).default([]),
  durationTargetSec: z.number().int().positive().optional(),
});

const plannerSchema = z.object({
  title: z.string().optional(),
  shots: z.array(shotSchema).min(2).max(8),
});

export type ShotPlannerResult = {
  title: string;
  shots: ShotPlan[];
  warnings: string[];
};

export async function planShotsFromScript(
  script: string,
  title?: string,
): Promise<ShotPlannerResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    const fallback = createFallbackPlan(script, title);
    return {
      ...fallback,
      warnings: ["未配置 OPENAI_API_KEY，已使用本地规则生成镜头需求。"],
    };
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是资深广告分镜与视频素材检索策划。只输出合法 JSON，不输出 Markdown。",
        },
        {
          role: "user",
          content: [
            "请把下面项目介绍视频文案拆解为 4-6 个可检索的视频素材镜头需求。",
            "每个镜头必须包含：sequence, title, brief, subject, motion, style, keywordsZh, keywordsEn, forbiddenTypes, durationTargetSec。",
            "keywordsEn 应适合 Pexels/Pixabay 英文检索；forbiddenTypes 用英文描述不希望出现的素材类型。",
            "输出 JSON 结构：{ \"title\": string, \"shots\": Shot[] }。",
            "",
            `文案：${script}`,
          ].join("\n"),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned empty content");
    }

    const parsed = plannerSchema.parse(JSON.parse(content));
    return {
      title: title?.trim() || parsed.title || inferTitle(script),
      shots: normalizeShotSequences(parsed.shots),
      warnings: [],
    };
  } catch (error) {
    const fallback = createFallbackPlan(script, title);
    return {
      ...fallback,
      warnings: [
        `LLM 拆镜失败，已使用本地规则生成镜头需求：${error instanceof Error ? error.message : "unknown error"}`,
      ],
    };
  }
}

function createFallbackPlan(script: string, title?: string): ShotPlannerResult {
  const domain = detectDomain(script);
  const projectTitle = title?.trim() || inferTitle(script);
  const termsZh = extractChineseTerms(script);

  const shots: ShotPlan[] = [
    {
      sequence: 1,
      title: "开场环境",
      brief: "建立项目所在场景和目标用户的真实语境。",
      subject: domain.openingSubject,
      motion: "slow push-in, aerial establishing, gentle camera movement",
      style: "clean cinematic, bright natural light, modern commercial",
      keywordsZh: uniqueStrings(["城市", "办公", "真实场景", ...termsZh.slice(0, 2)]),
      keywordsEn: uniqueStrings([domain.openingKeyword, "modern city", "office workflow"]),
      forbiddenTypes: ["cartoon", "illustration", "watermark", "vertical video"],
      durationTargetSec: 5,
    },
    {
      sequence: 2,
      title: "问题呈现",
      brief: "表现用户遇到的效率、沟通或业务痛点。",
      subject: domain.problemSubject,
      motion: "handheld detail shot, focused close-up, subtle motion",
      style: "documentary, realistic, muted background",
      keywordsZh: uniqueStrings(["忙碌", "沟通", "数据", ...termsZh.slice(1, 3)]),
      keywordsEn: uniqueStrings([domain.problemKeyword, "busy team", "workflow problem"]),
      forbiddenTypes: ["animation", "cartoon", "low resolution", "watermark"],
      durationTargetSec: 6,
    },
    {
      sequence: 3,
      title: "方案运行",
      brief: "呈现产品或平台正在被使用，形成清晰的解决方案画面。",
      subject: domain.solutionSubject,
      motion: "screen interaction, tracking shot, smooth pan",
      style: "tech commercial, precise, high clarity",
      keywordsZh: uniqueStrings(["平台", "操作", "科技", ...termsZh.slice(2, 4)]),
      keywordsEn: uniqueStrings([domain.solutionKeyword, "software interface", "technology platform"]),
      forbiddenTypes: ["abstract background only", "cartoon", "watermark", "portrait crop"],
      durationTargetSec: 7,
    },
    {
      sequence: 4,
      title: "价值结果",
      brief: "展示使用后的成果、协同或增长状态。",
      subject: domain.resultSubject,
      motion: "group discussion, confident movement, reveal shot",
      style: "optimistic, professional, crisp contrast",
      keywordsZh: uniqueStrings(["团队", "成果", "增长", ...termsZh.slice(3, 5)]),
      keywordsEn: uniqueStrings([domain.resultKeyword, "successful team", "business growth"]),
      forbiddenTypes: ["sad mood", "blurred footage", "watermark", "vertical video"],
      durationTargetSec: 6,
    },
    {
      sequence: 5,
      title: "收束品牌",
      brief: "以开放、向前的画面收束项目气质。",
      subject: domain.closingSubject,
      motion: "wide shot, forward movement, sunrise reveal",
      style: "aspirational, premium, clean ending",
      keywordsZh: uniqueStrings(["未来", "愿景", "前进", ...termsZh.slice(4, 6)]),
      keywordsEn: uniqueStrings([domain.closingKeyword, "future city", "inspiring ending"]),
      forbiddenTypes: ["dark horror", "cartoon", "watermark", "low resolution"],
      durationTargetSec: 5,
    },
  ];

  return { title: projectTitle, shots, warnings: [] };
}

function detectDomain(script: string) {
  const text = script.toLowerCase();
  if (/医疗|健康|医院|医生|patient|health/.test(text)) {
    return {
      openingSubject: "医疗场景、医护团队或健康服务环境",
      problemSubject: "患者等待、医护沟通或数据流转压力",
      solutionSubject: "医生使用数字化系统或健康数据平台",
      resultSubject: "医患沟通顺畅、医疗团队协作",
      closingSubject: "明亮可靠的健康服务未来画面",
      openingKeyword: "healthcare professionals",
      problemKeyword: "hospital workflow",
      solutionKeyword: "medical technology",
      resultKeyword: "doctor patient care",
      closingKeyword: "healthy future",
    };
  }

  return {
    openingSubject: "城市、办公室或真实业务场景",
    problemSubject: "团队协作、业务流程或信息处理压力",
    solutionSubject: "数字平台、软件操作或智能技术应用",
    resultSubject: "团队协作顺畅、业务增长和客户满意",
    closingSubject: "城市天际线、向前移动或明亮未来画面",
    openingKeyword: "modern business office",
    problemKeyword: "business workflow",
    solutionKeyword: "digital technology platform",
    resultKeyword: "team success",
    closingKeyword: "future city skyline",
  };
}

function inferTitle(script: string): string {
  const clean = script.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "视频素材搜索项目";
  }
  return clean.length > 24 ? `${clean.slice(0, 24)}...` : clean;
}

function extractChineseTerms(script: string): string[] {
  return uniqueStrings(
    script
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, " ")
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2 && term.length <= 8),
  ).slice(0, 8);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeShotSequences(shots: ShotPlan[]): ShotPlan[] {
  return shots.map((shot, index) => ({
    ...shot,
    sequence: index + 1,
    keywordsZh: uniqueStrings(shot.keywordsZh),
    keywordsEn: uniqueStrings(shot.keywordsEn),
    forbiddenTypes: uniqueStrings(shot.forbiddenTypes),
  }));
}
