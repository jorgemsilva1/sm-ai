import crypto from "crypto";

function base64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateState() {
  return base64Url(crypto.randomBytes(32));
}

export function generateCodeVerifier() {
  return base64Url(crypto.randomBytes(48));
}

export function codeChallengeS256(verifier: string) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64Url(hash);
}

