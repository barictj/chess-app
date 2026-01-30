// lib/theme.ts
export type Theme = {
  bg: string;
  card: string;
  text: string;
  subtext: string;
  primary: string;
  border: string;
};

// lib/theme.ts
export const themes: Record<"light" | "dark", Theme> = {
  light: {
    bg: "#EAF1F7", // ← light blue-gray (CWF feel)
    card: "#FFFFFF", // white cards
    text: "#1C1E21",
    subtext: "rgba(28,30,33,.6)",
    primary: "#2F6BFF", // CWF-ish blue button
    border: "rgba(28,30,33,.12)",
  },
  dark: {
    bg: "#0F131A",
    card: "#1A1F2B",
    text: "#F2F3F5",
    subtext: "rgba(242,243,245,.65)",
    primary: "#4C82FF",
    border: "rgba(242,243,245,.14)",
  },
};
