import { app, BrowserWindow } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface WindowState {
  x?: number;
  y?: number;
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultWindowSize = {
  width: 360,
  height: 520,
};

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");

function createWindow(windowState: WindowState) {
  const window = new BrowserWindow({
    ...defaultWindowSize,
    x: windowState.x,
    y: windowState.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      preload: path.join(dirname, "../preload/index.mjs"),
    },
  });

  window.on("moved", () => {
    void persistWindowState(window);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }

  void window.loadFile(path.join(dirname, "../renderer/index.html"));
}

async function readWindowState(): Promise<WindowState> {
  try {
    const filePath = getWindowStateFilePath();
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as WindowState;
    return {
      x: typeof parsed.x === "number" ? parsed.x : undefined,
      y: typeof parsed.y === "number" ? parsed.y : undefined,
    };
  } catch {
    return {};
  }
}

async function persistWindowState(window: BrowserWindow) {
  const bounds = window.getBounds();
  const filePath = getWindowStateFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    JSON.stringify(
      {
        x: bounds.x,
        y: bounds.y,
      },
      null,
      2,
    ),
    "utf8",
  );
}

function getWindowStateFilePath() {
  return path.join(app.getPath("userData"), "window-state.json");
}

void app.whenReady().then(async () => {
  const windowState = await readWindowState();
  createWindow(windowState);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
