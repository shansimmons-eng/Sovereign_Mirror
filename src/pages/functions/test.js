export async function onRequest(context) {
  return new Response(JSON.stringify({ message: "Hello from Pages Function!" }), {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}