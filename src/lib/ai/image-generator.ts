import { getOpenAIClient } from "@/lib/ai/openai";
import { getOpenAIImageModel } from "@/lib/ai/openai";

export async function generateImageBase64(params: {
  prompt: string;
  size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
  outputFormat?: "png" | "jpeg" | "webp";
}) {
  const client = getOpenAIClient();
  const model = getOpenAIImageModel();

  const res = await client.images.generate({
    model,
    prompt: params.prompt,
    size: params.size ?? "1024x1024",
    quality: params.quality ?? "high",
    output_format: params.outputFormat ?? "png",
    n: 1,
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image generation returned no b64_json.");
  }

  return { b64, revisedPrompt: res.data?.[0]?.revised_prompt ?? null };
}

