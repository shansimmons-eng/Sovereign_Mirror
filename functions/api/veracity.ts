interface Env {
  DB: D1Database;
}

export async function onRequest({ request }: { request: Request; env: Env }): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { active, control } = body;

    const vActive = active || 0.5;
    const vControl = control || 0.3;
    const veracity = Math.max(0, vActive - vControl);

    return new Response(JSON.stringify({
      veracity: veracity.toFixed(6),
      timestamp: Date.now(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Invalid request body',
      timestamp: Date.now() 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}