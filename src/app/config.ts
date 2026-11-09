export const appConfig = {
  appName: "Morrow Agent",
  assistantName: "Lumi",
  version: "0.1.0",
  defaultTheme: "dark",
} as const;

export type AppConfig = typeof appConfig;
