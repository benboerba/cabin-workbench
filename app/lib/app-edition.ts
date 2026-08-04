export type AppEdition = "local" | "server";

export function getAppEdition(): AppEdition {
  return process.env.APP_MODE === "local" ? "local" : "server";
}

export function isLocalEdition(): boolean {
  return getAppEdition() === "local";
}
