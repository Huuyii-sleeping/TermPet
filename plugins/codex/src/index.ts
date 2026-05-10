import type { PluginContext, TermPetPlugin } from "@termpet/plugin-sdk";
import { mapCodexHookToEvent } from "./codex-event.js";

export const codexPlugin: TermPetPlugin = {
  id: "codex",
  name: "Codex Adapter",
  version: "0.1.0",
  type: "hook",
  async handleEvent(input: unknown, _context: PluginContext) {
    return [mapCodexHookToEvent(input)];
  },
};

export { mapCodexHookToEvent } from "./codex-event.js";

export default codexPlugin;
