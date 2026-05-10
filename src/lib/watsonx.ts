/**
 * IBM watsonx.ai — primary LLM path for dead-zone stories when env is set; Gemini/Anthropic used after.
 * Wrapped here so IAM token exchange stays server-only.
 */

const IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token";

export type WatsonxTextGenParams = {
  prompt: string;
  /** IBM Cloud API key (same as CLI / console). */
  apiKey: string;
  /** watsonx project GUID from IBM Cloud watsonx project settings. */
  projectId: string;
  /** Region base URL, e.g. https://us-south.ml.cloud.ibm.com */
  baseUrl: string;
  modelId: string;
  maxNewTokens: number;
  temperature: number;
  apiVersion?: string;
};

export function isWatsonxConfigured(): boolean {
  const key = (
    process.env.IBM_CLOUD_API_KEY ??
    process.env.WATSONX_API_KEY ??
    ""
  ).trim();
  const projectId = (process.env.WATSONX_PROJECT_ID ?? "").trim();
  return Boolean(key && projectId);
}

export async function getIbmCloudBearerToken(apiKey: string): Promise<string> {
  const body = new URLSearchParams();
  body.set("grant_type", "urn:ibm:params:oauth:grant-type:apikey");
  body.set("apikey", apiKey.trim());

  const res = await fetch(IAM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`IBM IAM token error ${res.status}: ${t}`);
  }

  const raw = (await res.json()) as { access_token?: string };
  const token = raw?.access_token?.trim();
  if (!token) {
    throw new Error("IBM IAM: no access_token in response");
  }
  return token;
}

/** Returns trimmed generated text, or throws. */
export async function watsonxTextGeneration(p: WatsonxTextGenParams): Promise<string> {
  const version = p.apiVersion ?? "2024-05-31";
  const base = p.baseUrl.replace(/\/+$/, "");
  const url = `${base}/ml/v1/text/generation?version=${encodeURIComponent(version)}`;

  const token = await getIbmCloudBearerToken(p.apiKey);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      input: p.prompt,
      model_id: p.modelId,
      project_id: p.projectId,
      parameters: {
        decoding_method: "sample",
        max_new_tokens: p.maxNewTokens,
        temperature: p.temperature,
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`watsonx text generation ${res.status}: ${t}`);
  }

  const raw = (await res.json()) as {
    results?: Array<{ generated_text?: string }>;
  };
  const text = raw?.results?.[0]?.generated_text?.trim();
  if (!text) {
    throw new Error("watsonx returned empty generated_text");
  }
  return text;
}

export function getWatsonxEnvForStory(): {
  apiKey: string;
  projectId: string;
  baseUrl: string;
  modelId: string;
} | null {
  const apiKey = (
    process.env.IBM_CLOUD_API_KEY ??
    process.env.WATSONX_API_KEY ??
    ""
  ).trim();
  const projectId = (process.env.WATSONX_PROJECT_ID ?? "").trim();
  const baseUrl = (
    process.env.WATSONX_URL ??
    "https://us-south.ml.cloud.ibm.com"
  ).trim();
  const modelId = (
    process.env.WATSONX_MODEL_ID ?? "ibm/granite-3-8b-instruct"
  ).trim();

  if (!apiKey || !projectId) return null;
  return { apiKey, projectId, baseUrl, modelId };
}
