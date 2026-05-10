import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapCodexHookToEvent } from "./codex-event.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const repoRoot = path.resolve(currentDirPath, "../../..");
const defaultBridgeUrl = process.env.TERM_PET_BRIDGE_URL ?? buildDefaultBridgeUrl();
const defaultHooksFile = path.join(repoRoot, ".termpet", "codex-hooks.json");

async function main() {
  const [command = "forward", ...restArgs] = process.argv.slice(2);

  switch (command) {
    case "forward":
      await forwardHookPayload(restArgs);
      return;
    case "write-hooks":
      await writeHooksFile(restArgs);
      return;
    case "print-hooks":
      printHooks(restArgs);
      return;
    case "run":
      await runCodex(restArgs);
      return;
    default:
      throw new Error(`Unsupported command: ${command}`);
  }
}

async function forwardHookPayload(args: string[]) {
  const bridgeUrl = getOptionValue(args, "--bridge-url") ?? defaultBridgeUrl;
  const rawInput = await readStdin();

  if (!rawInput.trim()) {
    return;
  }

  try {
    const payload = JSON.parse(rawInput) as unknown;
    const event = mapCodexHookToEvent(payload);
    await postEvent(bridgeUrl, event);
  } catch (error) {
    if (process.env.TERM_PET_HOOK_STRICT === "1") {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[termpet-codex-hook] ${message}\n`);
      process.exitCode = 1;
      return;
    }

    if (process.env.TERM_PET_HOOK_DEBUG === "1") {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[termpet-codex-hook] ${message}\n`);
    }
  }
}

async function writeHooksFile(args: string[]) {
  const outputPath = path.resolve(getOptionValue(args, "--output") ?? defaultHooksFile);
  const bridgeUrl = getOptionValue(args, "--bridge-url") ?? defaultBridgeUrl;
  await ensureHooksFile(outputPath, bridgeUrl);
  process.stdout.write(`${outputPath}\n`);
}

function printHooks(args: string[]) {
  const bridgeUrl = getOptionValue(args, "--bridge-url") ?? defaultBridgeUrl;
  process.stdout.write(`${JSON.stringify(buildHooksConfig(bridgeUrl), null, 2)}\n`);
}

async function runCodex(args: string[]) {
  const hookFilePath = await ensureHooksFile(defaultHooksFile, defaultBridgeUrl);
  const runtimeCodexArgs = [
    "-c",
    `hooks=${normalizeForCodexConfig(hookFilePath)}`,
    "-c",
    "features.codex_hooks=true",
    ...args,
  ];
  const codexCommand = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "codex";
  const codexArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", buildWindowsCommand("codex.cmd", runtimeCodexArgs)] : runtimeCodexArgs;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(codexCommand, codexArgs, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      process.exitCode = code ?? 0;
      resolve();
    });
  });
}

async function ensureHooksFile(outputPath: string, bridgeUrl: string): Promise<string> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(buildHooksConfig(bridgeUrl), null, 2)}\n`, "utf8");
  return outputPath;
}

function buildHooksConfig(bridgeUrl: string) {
  const command = buildForwardCommand(bridgeUrl);
  const hookEntry = {
    type: "command",
    command,
    timeout: 10,
    suppressOutput: true,
  };

  return {
    hooks: {
      SessionStart: [{ hooks: [hookEntry] }],
      UserPromptSubmit: [{ hooks: [hookEntry] }],
      PreToolUse: [{ hooks: [hookEntry] }],
      PostToolUse: [{ hooks: [hookEntry] }],
      PermissionRequest: [{ hooks: [hookEntry] }],
      Stop: [{ hooks: [hookEntry] }],
    },
  };
}

function buildForwardCommand(bridgeUrl: string): string {
  const nodePath = normalizeCommandPath(process.execPath);
  const scriptPath = normalizeCommandPath(currentFilePath);

  return `${quoteForShell(nodePath)} ${quoteForShell(scriptPath)} forward --bridge-url ${quoteForShell(bridgeUrl)}`;
}

async function postEvent(bridgeUrl: string, event: unknown) {
  const response = await fetch(bridgeUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`Bridge returned ${response.status}`);
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function getOptionValue(args: string[], flagName: string): string | undefined {
  const index = args.indexOf(flagName);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function buildDefaultBridgeUrl(): string {
  const bridgePort = process.env.TERM_PET_BRIDGE_PORT ?? "47631";
  return `http://127.0.0.1:${bridgePort}/events`;
}

function normalizeForCodexConfig(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizeCommandPath(value: string): string {
  return path.normalize(value).replace(/\\/g, "/");
}

function quoteForShell(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function buildWindowsCommand(command: string, args: string[]): string {
  return [command, ...args.map(quoteForWindowsCmd)].join(" ");
}

function quoteForWindowsCmd(value: string): string {
  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[termpet-codex-hook] ${message}\n`);
  process.exit(1);
});
