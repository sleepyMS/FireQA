import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const isWatch = process.argv.includes("--watch");

// 빌드 타임에 서버 URL 주입 (환경변수 또는 기본값)
const serverUrl = process.env.FIREQA_SERVER_URL || "http://localhost:3001";

// Build main.ts (Figma sandbox)
const mainConfig = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/main.js",
  target: "es2017",
  format: "iife",
};

// Copy and process ui.html — 서버 URL을 빌드 타임에 치환
function buildUI() {
  mkdirSync("dist", { recursive: true });
  let html = readFileSync("src/ui.html", "utf-8");
  html = html.replace(/__FIREQA_SERVER_URL__/g, serverUrl);
  writeFileSync("dist/ui.html", html);
  console.log(`Built dist/ui.html (server: ${serverUrl})`);
}

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context(mainConfig);
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await esbuild.build(mainConfig);
    console.log("Built dist/main.js");
  }
  buildUI();
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
