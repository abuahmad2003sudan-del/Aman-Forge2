import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { resolveApiKey, PROVIDERS } from '../../shared/aiProviders.ts';

// Returns secret-presence flags only. It never sends a billable probe request,
// accepts credentials, or returns secret values to the browser.
export default async function (req) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) {
      return Response.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401, headers });
    }

    const providers = {};
    for (const id of Object.keys(PROVIDERS)) {
      providers[id] = Boolean(resolveApiKey(id));
    }

    return Response.json({ providers }, { headers });
  } catch {
    return Response.json(
      { error: 'تعذّر قراءة إعداد أسرار المزوّدين' },
      { status: 500, headers },
    );
  }
}