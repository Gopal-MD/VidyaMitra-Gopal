import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { vidyaMitraApiPlugin } from "./server/apiServer";
import { openaiProxyPlugin } from "./server/openaiProxy";

// ── Static-serve plugin for /videos folder ───────────────────────────────
// Serves files in ./videos/ at /screenshots/<filename> during dev.
// In production, copy the videos/ folder to dist/screenshots/ manually.
// UPDATE_POINT: If you rename the videos folder or want a different URL prefix,
// change `videosDir` and `urlPrefix` below.
function videosStaticPlugin() {
  const videosDir = path.resolve(__dirname, "videos");
  const urlPrefix = "/screenshots/";
  const staticMiddleware = (req: any, res: any, next: any) => {
    if (!req.url?.startsWith(urlPrefix)) return next();
    const file = req.url.slice(urlPrefix.length).split("?")[0];
    const filePath = path.join(videosDir, decodeURIComponent(file));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".mp4": "video/mp4",
        ".webp": "image/webp",
      };
      res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
      fs.createReadStream(filePath).pipe(res);
    } else {
      next();
    }
  };

  return {
    name: "videos-static",
    configureServer(server: any) {
      server.middlewares.use(staticMiddleware);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(staticMiddleware);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    strictPort: true,
  },
  plugins: [
    react(),
    // Serve ./videos/ folder at /screenshots/* during dev
    videosStaticPlugin(),
    // VidyaMitra backend API (auth, DB, proxies)
    vidyaMitraApiPlugin(),
    // OpenAI backend proxy — key stays server-side
    openaiProxyPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
