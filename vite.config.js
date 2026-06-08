import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        trends: resolve(__dirname, "trends.html"),
        report: resolve(__dirname, "report.html"),
        log: resolve(__dirname, "log.html"),
        goals: resolve(__dirname, "goals.html"),
        entry: resolve(__dirname, "entry.html"),
        aiAssistant: resolve(__dirname, "ai-assistant.html"),
        inbody: resolve(__dirname, "inbody.html"),
      },
    },
  },
});
