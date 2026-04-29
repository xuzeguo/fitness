import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // 相对路径，便于 dist 用任意静态服务或子目录部署；也可配合 file:// 加载同目录脚本（数据仍需 http 访问）
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        trends: resolve(__dirname, "trends.html"),
        report: resolve(__dirname, "report.html"),
        log: resolve(__dirname, "log.html"),
        goals: resolve(__dirname, "goals.html"),
        entry: resolve(__dirname, "entry.html"),
      },
    },
  },
});
