interface Env {
  DB: D1Database;
}

export async function onRequest({ request, env }: { request: Request; env: Env }): Promise<Response> {
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
    const { mode, level } = body;

    const canEngage = level > 0.3;
    const threshold = 0.618;
    const status = canEngage ? 'ENGAGED' : 'STANDBY';

    const response = {
      mode: mode || 'resonance',
      level: level || 0,
      threshold,
      canEngage,
      status,
      message: canEngage 
        ? 'P-Gate threshold exceeded. Resonance cascade initiated.' 
        : 'P-Gate below threshold. Accumulating resonance.',
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify(response), {
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