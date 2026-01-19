import OpenAI from "openai";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY env var.");
  return new OpenAI({ apiKey });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function getOpenAIImageModel() {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
}

