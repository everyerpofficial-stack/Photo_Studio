import { randomUUID } from "node:crypto";

export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export const uuid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return randomUUID();
};

export const nowIso = () => new Date().toISOString();
