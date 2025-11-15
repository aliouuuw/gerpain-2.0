import { randomBytes } from "crypto";

export function generateRandomString(length: number): string {
  return randomBytes(length).toString("hex");
}

export function generateApiKey(): string {
  return `bk_${generateRandomString(32)}`;
}

