/**
 * Version configuration for RefertoSicuro Frontend
 * Build information is injected by CI/CD pipeline
 */

export const VERSION = {
  app: "2.0.0",
  build: import.meta.env.VITE_BUILD_NUMBER || "local",
  buildDate: import.meta.env.VITE_BUILD_DATE || "unknown",
  gitCommit: import.meta.env.VITE_GIT_COMMIT || "unknown",
  environment: import.meta.env.MODE || "development",
};

export const getVersionString = (): string => {
  return `v${VERSION.app} (${VERSION.build})`;
};

export const getFullVersionInfo = () => {
  return {
    version: VERSION.app,
    build: VERSION.build,
    buildDate: VERSION.buildDate,
    gitCommit: VERSION.gitCommit,
    environment: VERSION.environment,
  };
};
