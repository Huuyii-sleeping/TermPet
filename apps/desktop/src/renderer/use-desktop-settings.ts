import { startTransition, useEffect, useState } from "react";

export interface DesktopSettings {
  reminderMode: "all" | "critical_only";
  showSuccessToast: boolean;
}

export interface DesktopSettingsView {
  settings: DesktopSettings;
  updateReminderMode(reminderMode: DesktopSettings["reminderMode"]): void;
  updateShowSuccessToast(showSuccessToast: boolean): void;
}

const storageKey = "termpet.desktop.settings";

const defaultSettings: DesktopSettings = {
  reminderMode: "all",
  showSuccessToast: true,
};

export function useDesktopSettings(): DesktopSettingsView {
  const [settings, setSettings] = useState<DesktopSettings>(defaultSettings);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<DesktopSettings>;
      setSettings({
        reminderMode: parsed.reminderMode === "critical_only" ? "critical_only" : "all",
        showSuccessToast: typeof parsed.showSuccessToast === "boolean" ? parsed.showSuccessToast : true,
      });
    } catch (error) {
      console.warn("桌面端设置恢复失败，已回退默认值。", error);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings]);

  return {
    settings,
    updateReminderMode(reminderMode) {
      startTransition(() => {
        setSettings((previous) => ({
          ...previous,
          reminderMode,
        }));
      });
    },
    updateShowSuccessToast(showSuccessToast) {
      startTransition(() => {
        setSettings((previous) => ({
          ...previous,
          showSuccessToast,
        }));
      });
    },
  };
}
