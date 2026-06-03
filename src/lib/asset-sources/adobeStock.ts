import type { AssetSource } from "./types";

export const adobeStockSource: AssetSource = {
  id: "adobe_stock",
  label: "Adobe Stock",
  isConfigured: () => false,
  async searchVideos() {
    return {
      assets: [],
      warnings: ["Adobe Stock 适配器占位已保留，当前 MVP 未启用。"],
    };
  },
};
