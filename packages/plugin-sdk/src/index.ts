import type { TermPetActionRequest, TermPetActionResult, TermPetEvent } from "@termpet/protocol";

export interface PluginContext {
  emit(event: TermPetEvent): Promise<void>;
  log(level: "info" | "warn" | "error", message: string, metadata?: unknown): void;
  getSettings<T = unknown>(pluginId: string): Promise<T | undefined>;
}

export interface TermPetPlugin {
  id: string;
  name: string;
  version: string;
  type: "hook" | "wrapper" | "parser";
  setup?(context: PluginContext): Promise<void>;
  handleEvent?(input: unknown, context: PluginContext): Promise<TermPetEvent[]>;
  handleAction?(action: TermPetActionRequest, context: PluginContext): Promise<TermPetActionResult>;
  stop?(): Promise<void>;
}
