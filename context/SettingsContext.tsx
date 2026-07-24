import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CustomToken {
  id: string;
  name: string;
  value: string;
}

export interface Settings {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  customTokens: CustomToken[];
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  addToken: (name: string, value: string) => Promise<void>;
  removeToken: (id: string) => Promise<void>;
}

const DEFAULTS: Settings = {
  aiBaseUrl: 'https://apihub.agnes-ai.com/v1',
  aiApiKey: '',
  aiModel: 'gpt-4o-mini',
  customTokens: [],
};

const KEY = '@remcute_settings';

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try { setSettings({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const save = async (next: Settings) => {
    setSettings(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    await save({ ...settings, ...updates });
  };

  const addToken = async (name: string, value: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await save({ ...settings, customTokens: [...settings.customTokens, { id, name, value }] });
  };

  const removeToken = async (id: string) => {
    await save({ ...settings, customTokens: settings.customTokens.filter((t) => t.id !== id) });
  };

  if (!loaded) return null;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, addToken, removeToken }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
