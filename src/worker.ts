export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env);
    }

    return handleAssets(request);
  },
};

async function handleAPI(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ status: 'ok', timestamp: Date.now() }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      } 
    }
  );
}

async function handleAssets(_request: Request): Promise<Response> {
  return new Response(
    JSON.stringify({ 
      message: 'Sovereign Mirror - Frontend served from Cloudflare Pages',
      deployed: true 
    }),
    { 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}