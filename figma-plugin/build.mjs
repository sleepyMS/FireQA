import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const isWatch = process.argv.includes("--watch");

// Build main.ts (Figma sandbox)
const mainConfig = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/main.js",
  target: "es2017",
  format: "iife",
};

// Copy and process ui.html
function buildUI() {
  mkdirSync("dist", { recursive: true });
  const html = readFileSync("src/ui.html", "utf-8");
  writeFileSync("dist/ui.html", html);
  console.log("Built dist/ui.html");
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
