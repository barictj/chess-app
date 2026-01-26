import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes, Theme } from "./theme";
import { boardThemes, BoardKey } from "./boards";

type Mode = "light" | "dark";

type Ctx = {
  theme: Theme;
  mode: Mode;
  setMode: (m: Mode) => void;

  boardKey: BoardKey;
  setBoardKey: (k: BoardKey) => void;
  boardTheme: (typeof boardThemes)[BoardKey];
};

const STORAGE_KEY = "app_theme_prefs_v1";

const ThemeCtx = React.createContext<Ctx>({
  theme: themes.light,
  mode: "light",
  setMode: () => {},
  boardKey: "classic",
  setBoardKey: () => {},
  boardTheme: boardThemes.classic,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, _setMode] = React.useState<Mode>("light");
  const [boardKey, _setBoardKey] = React.useState<BoardKey>("classic");
  const [hydrated, setHydrated] = React.useState(false);

  // load once
  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.mode === "light" || parsed?.mode === "dark")
            _setMode(parsed.mode);
          if (parsed?.boardKey && boardThemes[parsed.boardKey])
            _setBoardKey(parsed.boardKey);
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  // persist helper
  async function persist(nextMode: Mode, nextBoardKey: BoardKey) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode: nextMode, boardKey: nextBoardKey }),
      );
    } catch {}
  }

  const setMode = (m: Mode) => {
    _setMode(m);
    persist(m, boardKey);
  };

  const setBoardKey = (k: BoardKey) => {
    _setBoardKey(k);
    persist(mode, k);
  };

  // optional: avoid flash of default theme
  if (!hydrated) return null;

  return (
    <ThemeCtx.Provider
      value={{
        theme: themes[mode],
        mode,
        setMode,
        boardKey,
        setBoardKey,
        boardTheme: boardThemes[boardKey],
      }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => React.useContext(ThemeCtx);
