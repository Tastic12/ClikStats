/**
 * CLIP (ViT-B/32) embeddings via @xenova/transformers.
 *
 * Both modalities (text + image) project into a shared 512-dimensional space,
 * so a text query can be compared directly against image embeddings using
 * cosine similarity.
 *
 * Caches loaded pipelines at module scope so that within a single warm
 * serverless instance the ~150 MB model is loaded once, then reused.
 */

import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
} from '@xenova/transformers'

const MODEL_ID = 'Xenova/clip-vit-base-patch32'

// Tell transformers.js to use the hosted model files and write the cache to
// the writable /tmp dir Vercel provides for serverless functions.
env.allowLocalModels = false
env.allowRemoteModels = true
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  env.cacheDir = '/tmp/.transformers-cache'
}

type TextModel = Awaited<ReturnType<typeof CLIPTextModelWithProjection.from_pretrained>>
type VisionModel = Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>>
type Tokenizer = Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>
type Processor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>

let textBundle: Promise<{ tokenizer: Tokenizer; model: TextModel }> | null = null
let visionBundle: Promise<{ processor: Processor; model: VisionModel }> | null = null

async function getTextBundle() {
  if (!textBundle) {
    textBundle = Promise.all([
      AutoTokenizer.from_pretrained(MODEL_ID),
      CLIPTextModelWithProjection.from_pretrained(MODEL_ID, { quantized: true }),
    ]).then(([tokenizer, model]) => ({ tokenizer, model }))
  }
  return textBundle
}

async function getVisionBundle() {
  if (!visionBundle) {
    visionBundle = Promise.all([
      AutoProcessor.from_pretrained(MODEL_ID),
      CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { quantized: true }),
    ]).then(([processor, model]) => ({ processor, model }))
  }
  return visionBundle
}

function l2Normalize(vec: number[]): number[] {
  let sumSq = 0
  for (const v of vec) sumSq += v * v
  const norm = Math.sqrt(sumSq) || 1
  return vec.map((v) => v / norm)
}

/**
 * Embed a text string into a 512-d L2-normalised vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const { tokenizer, model } = await getTextBundle()
  const inputs = tokenizer([text], { padding: true, truncation: true })
  const { text_embeds } = (await model(inputs)) as { text_embeds: { tolist: () => number[][] } }
  const raw = text_embeds.tolist()[0]
  return l2Normalize(raw)
}

/**
 * Embed an image (loaded from a remote URL) into a 512-d L2-normalised vector.
 * Throws if the URL is unreachable or returns a non-image.
 */
export async function embedImageFromUrl(url: string): Promise<number[]> {
  const { processor, model } = await getVisionBundle()
  const image = await RawImage.fromURL(url)
  const inputs = await processor(image)
  const { image_embeds } = (await model(inputs)) as {
    image_embeds: { tolist: () => number[][] }
  }
  const raw = image_embeds.tolist()[0]
  return l2Normalize(raw)
}

/**
 * Serialize an embedding for pgvector. Postgres accepts the textual form
 * `[0.1,0.2,...]`. We pass it via RPC as TEXT and cast to vector(512) inside
 * the SQL function — Supabase's JS client serializes RPC args as JSON, which
 * cannot be implicitly cast to vector.
 */
export function embeddingToPgvectorText(vec: number[]): string {
  return `[${vec.join(',')}]`
}
