export type BoardTheme = {
  light: string;
  dark: string;
  highlighted: string;
  moveFrom: string;
  moveTo: string;
  dot: string;
  hintBorder: string;
  hintGlow: string;
  hintLightBg: string;
  hintDarkBg: string;
};

export const boardThemes: Record<string, BoardTheme> = {
  classic: {
    light: "#F0D9B5",
    dark: "#B58863",
    highlighted: "#FFD54A",
    moveFrom: "rgba(255,213,74,0.45)",
    moveTo: "rgba(255,213,74,0.35)",
    dot: "rgba(0,0,0,0.25)",
    hintBorder: "#FFD54A",
    hintGlow: "rgba(255,213,74,0.55)",
    hintLightBg: "#F7E2C6",
    hintDarkBg: "#C4976E",
  },
  blue: {
    light: "#E8EEF8",
    dark: "#8EA6D8",
    highlighted: "#FFD54A",
    moveFrom: "rgba(255,213,74,0.45)",
    moveTo: "rgba(255,213,74,0.35)",
    dot: "rgba(0,0,0,0.22)",
    hintBorder: "#FFD54A",
    hintGlow: "rgba(255,213,74,0.55)",
    hintLightBg: "#EEF3FF",
    hintDarkBg: "#A8B9E4",
  },
  silg: {
    light: "#80EF80",
    dark: "#FF69B4",
    highlighted: "#B200ED",
    moveFrom: "#1E90FF",
    moveTo: "#00FFFF",
    dot: "rgba(0,0,0,0.22)",
    hintBorder: "#FFD54A",
    hintGlow: "rgba(255,213,74,0.55)",
    hintLightBg: "#EEF3FF",
    hintDarkBg: "#A8B9E4",
  },
};
export type BoardKey = keyof typeof boardThemes;
