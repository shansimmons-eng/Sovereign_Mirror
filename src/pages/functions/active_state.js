/**
 * Cloudflare Pages Function to serve dynamic active_state.json
 * Generates state with varying bolt/grain values over time
 */

export async function onRequest(context) {
  const now = Date.now()
  
  // Create slow-moving cyclic values for bolt/grain
  const cycleTime = now / 1000 // Convert to seconds
  
  // Bolt: slow sine wave between -0.5 and 0.5
  const bolt = 0.5 * Math.sin(cycleTime * 0.1)
  
  // Grain: slow sine wave between 0.0 and 1.0  
  const grain = 0.5 * (1 + Math.sin(cycleTime * 0.07 + Math.PI/4))
  
  // Base state 
  const state = {
    metadata: {
      simulation_timestamp: now,
      cycle_count: Math.floor(now / 15000), // 15-second cycles
      current_milestone_id: 'profile_standard_001',
      profile_type: 'STANDARD_OPERATIONAL',
      uptime_seconds: Math.floor(now / 1000)
    },
    telemetry: {
      alpha: 0.82,
      inverion_alpha: 0.82,
      noise: 0.12,
      boltzmann_noise: 0.12,
      temp: 0.55,
      boltzmann_temperature: 0.55,
      velocity: 0.38,
      state: 'ACTIVE',
      bolt: parseFloat(bolt.toFixed(3)),
      grain: parseFloat(grain.toFixed(3))
    },
    system: {
      resonance: 0.71,
      nodes_count: 47,
      particle_count: 4700,
      fission_stretch: 0.0
    },
    description: 'Standard operational state - balanced veracity flow'
  }
  
  return new Response(JSON.stringify(state, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*'
    }
  })
}