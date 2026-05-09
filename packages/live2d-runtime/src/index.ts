import type { TermPetState } from "@termpet/protocol";

export interface Live2DStateMotion {
  expression: string;
  motion: string;
}

export const defaultMotionByState: Record<TermPetState, Live2DStateMotion> = {
  idle: { expression: "neutral", motion: "idle_loop" },
  listening: { expression: "curious", motion: "listen" },
  thinking: { expression: "focused", motion: "thinking_loop" },
  working: { expression: "busy", motion: "typing_loop" },
  waiting_approval: { expression: "alert", motion: "raise_sign" },
  success: { expression: "happy", motion: "celebrate" },
  error: { expression: "confused", motion: "concerned" },
};

export function getMotionForState(state: TermPetState): Live2DStateMotion {
  return defaultMotionByState[state];
}
