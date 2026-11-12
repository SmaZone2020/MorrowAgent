import { beforeEach, describe, expect, it } from "vitest";
import {
  isLumiOnScreen,
  noteReplySettled,
  setLumiOnScreen,
  useLumiActivity,
} from "@/features/lumi/activity";
import { setLearnerProfile } from "@/features/lumi/learnerProfile";
import { EMPTY_PROFILE } from "@/features/lumi/prompts/registry";

const BOTH = { dot: true, toast: true };

describe("lumi activity", () => {
  beforeEach(() => {
    useLumiActivity.getState().reset();
    setLearnerProfile("w1", { ...EMPTY_PROFILE, packageName: "微积分" });
  });

  it("stays quiet while the page is on screen", () => {
    setLumiOnScreen("w1", true);
    noteReplySettled("w1", BOTH);

    expect(useLumiActivity.getState().unread).toEqual({});
    expect(useLumiActivity.getState().notices).toHaveLength(0);
  });

  it("marks and announces a reply that finished elsewhere", () => {
    noteReplySettled("w1", BOTH);

    const state = useLumiActivity.getState();
    expect(state.unread.w1).toBe(true);
    expect(state.notices).toHaveLength(1);
    expect(state.notices[0]?.packageName).toBe("微积分");
  });

  it("respects each switch on its own", () => {
    noteReplySettled("w1", { dot: true, toast: false });
    expect(useLumiActivity.getState().unread.w1).toBe(true);
    expect(useLumiActivity.getState().notices).toHaveLength(0);

    useLumiActivity.getState().reset();
    noteReplySettled("w1", { dot: false, toast: true });
    expect(useLumiActivity.getState().unread).toEqual({});
    expect(useLumiActivity.getState().notices).toHaveLength(1);
  });

  it("counts registrations, so a double mount is not a double unmount", () => {
    setLumiOnScreen("w1", true);
    setLumiOnScreen("w1", true);
    setLumiOnScreen("w1", false);
    expect(isLumiOnScreen("w1")).toBe(true);

    setLumiOnScreen("w1", false);
    expect(isLumiOnScreen("w1")).toBe(false);
  });

  it("clears the dot when the page is opened", () => {
    noteReplySettled("w1", BOTH);
    useLumiActivity.getState().clearUnread("w1");
    expect(useLumiActivity.getState().unread).toEqual({});
  });

  it("ignores a reply with no package", () => {
    noteReplySettled(null, BOTH);
    expect(useLumiActivity.getState().notices).toHaveLength(0);
  });
});
