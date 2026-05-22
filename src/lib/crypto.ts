import crypto from "crypto";

const KEY_HEX = process.env.GITHUB_ENCRYPTION_KEY || "";

export function encrypt(plaintext: string): string {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error("Invalid GITHUB_ENCRYPTION_KEY. Must be 32-byte hex (64 characters).");
  }
  const KEY = Buffer.from(KEY_HEX, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decrypt(ciphertext: string): string {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error("Invalid GITHUB_ENCRYPTION_KEY. Must be 32-byte hex (64 characters).");
  }
  const KEY = Buffer.from(KEY_HEX, "hex");
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !encHex) throw new Error("Malformed ciphertext");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
