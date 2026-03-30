import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConfigStore } from "./store.js";
import fs from "fs";
import path from "path";
import os from "os";

describe("ConfigStore", () => {
  let tmpDir: string;
  let store: ConfigStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fireqa-test-"));
    store = new ConfigStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("기본 설정값을 반환한다", () => {
    const config = store.load();
    expect(config.server).toBe("https://fireqa.vercel.app");
    expect(config.cli).toBe("claude");
    expect(config.pollingIntervalMs).toBe(3000);
  });

  it("설정을 저장하고 다시 읽을 수 있다", () => {
    store.save({ server: "http://localhost:3000", cli: "codex" });
    const config = store.load();
    expect(config.server).toBe("http://localhost:3000");
    expect(config.cli).toBe("codex");
  });

  it("토큰을 저장하고 읽을 수 있다", () => {
    store.setToken("fqa_test123");
    const config = store.load();
    expect(config.auth?.token).toBe("fqa_test123");
  });
});
