import type { TermPetAction, TermPetEvent } from "@termpet/protocol";

export interface PluginContext {
  emit(event: TermPetEvent): Promise<void>;
  log(level: "info" | "warn" | "error", message: string, metadata?: unknown): void;
  getSettings<T = unknown>(pluginId: string): Promise<T | undefined>;
}

export interface TermPetActionRequest {
  actionId: string;
  eventId: string;
  sessionId: string;
  source: string;
  kind: TermPetAction["kind"];
  metadata?: Record<string, unknown>;
}

export interface TermPetActionResult {
  ok: boolean;
  message?: string;
  requiresTerminalFallback?: boolean;
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
