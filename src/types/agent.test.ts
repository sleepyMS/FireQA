import { describe, it, expect } from "vitest";
import {
  AgentTaskStatus,
  AgentTaskType,
  AgentConnectionStatus,
  AGENT_TASK_STATUS_LABEL,
  AGENT_TASK_TYPE_LABEL,
} from "./agent";

describe("AgentTaskStatus", () => {
  it("모든 상태값이 정의되어 있다", () => {
    expect(AgentTaskStatus.PENDING).toBe("pending");
    expect(AgentTaskStatus.ASSIGNED).toBe("assigned");
    expect(AgentTaskStatus.RUNNING).toBe("running");
    expect(AgentTaskStatus.COMPLETED).toBe("completed");
    expect(AgentTaskStatus.FAILED).toBe("failed");
    expect(AgentTaskStatus.CANCELLED).toBe("cancelled");
    expect(AgentTaskStatus.TIMED_OUT).toBe("timed_out");
  });

  it("한글 라벨이 모든 상태에 존재한다", () => {
    for (const status of Object.values(AgentTaskStatus)) {
      expect(AGENT_TASK_STATUS_LABEL[status]).toBeDefined();
    }
  });
});

describe("AgentTaskType", () => {
  it("모든 작업 유형이 정의되어 있다", () => {
    expect(AgentTaskType.TC_GENERATE).toBe("tc-generate");
    expect(AgentTaskType.DIAGRAM_GENERATE).toBe("diagram-generate");
    expect(AgentTaskType.WIREFRAME_GENERATE).toBe("wireframe-generate");
    expect(AgentTaskType.IMPROVE_SPEC).toBe("improve-spec");
    expect(AgentTaskType.CUSTOM).toBe("custom");
  });

  it("한글 라벨이 모든 유형에 존재한다", () => {
    for (const type of Object.values(AgentTaskType)) {
      expect(AGENT_TASK_TYPE_LABEL[type]).toBeDefined();
    }
  });
});

describe("AgentConnectionStatus", () => {
  it("online/offline 상태가 정의되어 있다", () => {
    expect(AgentConnectionStatus.ONLINE).toBe("online");
    expect(AgentConnectionStatus.OFFLINE).toBe("offline");
  });
});
