import type { TermPetState } from "@termpet/protocol";
import { getMotionForState } from "@termpet/live2d-runtime";
import { useEffect } from "react";
import { createBridgeClient } from "./bridge-client";

const demoState: TermPetState = "idle";

export function PetShell() {
  const motion = getMotionForState(demoState);

  useEffect(() => {
    const client = createBridgeClient((event) => {
      console.info("收到桌宠事件", event);
    });

    client.connect();
    return () => client.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-transparent text-zinc-950">
      <section className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6">
        <div className="h-44 w-44 rounded-full border border-zinc-200 bg-white/85 shadow-xl backdrop-blur">
          <div className="flex h-full items-center justify-center text-center text-sm font-medium text-zinc-700">
            二维动态角色占位
          </div>
        </div>

        <div className="w-full rounded-lg border border-zinc-200 bg-white/90 p-4 shadow-lg backdrop-blur">
          <p className="text-xs text-zinc-500">当前状态</p>
          <h1 className="mt-1 text-lg font-semibold">空闲</h1>
          <p className="mt-2 text-sm text-zinc-600">
            动作：{motion.motion}，表情：{motion.expression}
          </p>
        </div>
      </section>
    </main>
  );
}
