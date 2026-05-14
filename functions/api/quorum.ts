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
    const { activeNodes, affirmingNodes } = body;

    const nodes = activeNodes || 10;
    const affirming = affirmingNodes || 5;
    const quorum = Math.min(nodes, Math.ceil(Math.sqrt(nodes)) + 2);
    const reached = affirming >= quorum;

    return new Response(JSON.stringify({
      quorum,
      reached,
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