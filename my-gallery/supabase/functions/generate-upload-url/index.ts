import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Storage } from "npm:@google-cloud/storage"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { filename, contentType } = await req.json()

    const storage = new Storage({
      projectId: Deno.env.get('GCP_PROJECT_ID'),
      credentials: JSON.parse(Deno.env.get('GCP_SERVICE_ACCOUNT_KEY') || '{}')
    })

    const bucket = storage.bucket(Deno.env.get('GCP_BUCKET_NAME') || '')
    const file = bucket.file(filename)

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, 
      contentType: contentType,
    })

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})