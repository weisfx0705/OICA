const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_BODY_CHARS = 180000;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

function sameOrigin(request, origin) {
  const requestUrl = new URL(request.url);
  if (!origin) return true;

  try {
    return new URL(origin).host === requestUrl.host;
  } catch (_) {
    return false;
  }
}

function getAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  if (sameOrigin(request, origin)) return true;

  const allowed = getAllowedOrigins(env);
  return allowed.includes('*') || allowed.includes(origin);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = getAllowedOrigins(env);
  const allowAny = allowed.includes('*');
  const allowOrigin = allowAny ? '*' : origin;

  if (!origin && !allowAny) return {};

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

export async function onRequestOptions({ request, env }) {
  const allowed = isAllowedOrigin(request, env);
  if (!allowed) {
    return json({ error: 'Forbidden origin' }, 403);
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env)
  });
}

export async function onRequestPost({ request, env }) {
  const allowed = isAllowedOrigin(request, env);
  const headers = allowed ? corsHeaders(request, env) : {};

  if (!allowed) {
    return json({ error: 'Forbidden origin' }, 403, headers);
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY is not configured' }, 500, headers);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return json({ error: 'Content-Type must be application/json' }, 415, headers);
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_CHARS) {
    return json({ error: 'Request body is too large' }, 413, headers);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (_) {
    return json({ error: 'Invalid JSON body' }, 400, headers);
  }

  const systemInstruction = String(payload.systemInstruction || '').trim();
  const contents = Array.isArray(payload.contents) ? payload.contents : null;
  if (!systemInstruction || !contents || contents.length === 0) {
    return json({ error: 'Missing systemInstruction or contents' }, 400, headers);
  }

  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const geminiBody = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: contents.slice(-8),
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          answer: { type: 'STRING' },
          relatedNums: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['answer', 'relatedNums']
      }
    }
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody)
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    let message = 'Gemini request failed';
    try {
      const parsed = JSON.parse(text);
      if (parsed.error && parsed.error.message) message = parsed.error.message;
    } catch (_) {}
    return json({ error: message }, upstream.status, headers);
  }

  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

export async function onRequest({ request, env }) {
  return json({ error: 'Method not allowed' }, 405, corsHeaders(request, env));
}
