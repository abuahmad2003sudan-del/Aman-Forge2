// Unified server-side access to every supported AI provider.
//
// SECURITY: API keys are NEVER accepted from the client, never stored in the
// browser, never written to logs and never returned in a response. Each provider
// resolves its credential from a platform-managed secret (environment variable)
// at request time, inside the backend function.

export const PROVIDERS = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    style: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    secret: 'OPENAI_API_KEY',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    style: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    secret: 'ANTHROPIC_API_KEY',
  },
  google: {
    id: 'google',
    label: 'Google Gemini',
    style: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    secret: 'GEMINI_API_KEY',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    style: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    secret: 'OPENROUTER_API_KEY',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    style: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    secret: 'DEEPSEEK_API_KEY',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    style: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    secret: 'GROQ_API_KEY',
  },
  xai: {
    id: 'xai',
    label: 'xAI',
    style: 'openai',
    baseUrl: 'https://api.x.ai/v1',
    secret: 'XAI_API_KEY',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    style: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    secret: 'MISTRAL_API_KEY',
  },
};

type ProviderId = keyof typeof PROVIDERS;
type ProviderMessage = { role: string; content: string };
type CallModelOptions = {
  provider: string;
  model: string;
  apiKey: string;
  system?: string;
  messages: ProviderMessage[];
  maxTokens?: number;
};

// Reads the provider credential from the platform secret store. Returns '' when
// the secret has not been configured, which callers surface as "not connected".
export function resolveApiKey(providerId: string): string {
  const p = PROVIDERS[providerId as ProviderId];
  if (!p) return '';
  try {
    return Deno.env.get(p.secret) || '';
  } catch {
    return '';
  }
}

async function failure(res: Response): Promise<Error> {
  let detail = '';
  try {
    const data = await res.json();
    detail = data?.error?.message || data?.message || JSON.stringify(data).slice(0, 300);
  } catch {
    detail = await res.text().catch(() => '');
  }
  return new Error(`${res.status} ${detail || res.statusText}`.trim());
}

export async function callModel({ provider, model, apiKey, system, messages, maxTokens = 8192 }: CallModelOptions): Promise<string> {
  const p = PROVIDERS[provider as ProviderId];
  if (!p) throw new Error('مزوّد غير مدعوم');
  if (!apiKey) throw new Error('المزوّد غير مربوط');
  if (!model) throw new Error('اسم الموديل مفقود');

  const signal = AbortSignal.timeout(180000);

  if (p.style === 'openai') {
    const body: Record<string, unknown> = { model, messages: system ? [{ role: 'system', content: system }, ...messages] : messages };
    if (provider !== 'openai') body.max_tokens = maxTokens;
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await failure(res);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  if (p.style === 'anthropic') {
    const res = await fetch(`${p.baseUrl}/messages`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      }),
    });
    if (!res.ok) throw await failure(res);
    const data = await res.json();
    const content: Array<{ type?: string; text?: string }> = Array.isArray(data?.content) ? data.content : [];
    return content.filter((c) => c.type === 'text').map((c) => c.text || '').join('\n');
  }

  const res = await fetch(`${p.baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) throw await failure(res);
  const data = await res.json();
  const parts: Array<{ text?: string }> = Array.isArray(data?.candidates?.[0]?.content?.parts)
    ? data.candidates[0].content.parts
    : [];
  return parts.map((part) => part.text || '').join('');
}

export function parseJsonReply(text: string): any {
  if (!text || !text.trim()) throw new Error('لم يرجع المزوّد أي نص');
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch {
    throw new Error('تعذّر قراءة استجابة الموديل (JSON غير صالح). جرّب موديلاً أقوى أو أعد المحاولة.');
  }
}