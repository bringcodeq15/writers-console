import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';

const DEFAULT_SETTINGS: Record<string, string> = {
  // API keys are configured by the user in Settings (Cmd+,)
};

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const items = await db.settings.toArray();
      const map: Record<string, string> = {};
      for (const item of items) {
        map[item.key] = item.value;
      }

      // Seed defaults for any missing keys
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (!map[key]) {
          await db.settings.put({ key, value });
          map[key] = value;
        }
      }

      setSettings(map);
    })();
  }, []);

  const getSetting = useCallback(
    (key: string, defaultValue = ''): string => {
      return settings[key] ?? defaultValue;
    },
    [settings]
  );

  const setSetting = useCallback(async (key: string, value: string) => {
    await db.settings.put({ key, value });
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { settings, getSetting, setSetting };
}
