import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * public-platform-stats
 * 
 * Returns cached platform statistics for the public homepage.
 * Reads from platform_stats_cache (populated by a separate cron job).
 * Falls back to live queries if cache is stale (>1 hour).
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 1. Try cached stats first
    const { data: cached } = await supabase
      .from('platform_stats_cache')
      .select('stat_key, stat_value, computed_at')
      .order('computed_at', { ascending: false })

    const now = Date.now()
    const isFresh = cached && cached.length > 0 &&
      (now - new Date(cached[0].computed_at).getTime()) < CACHE_TTL_MS

    if (isFresh && cached) {
      const stats: Record<string, number> = {}
      for (const row of cached) {
        stats[row.stat_key] = row.stat_value
      }
      return new Response(
        JSON.stringify({ success: true, data: { stats, cached: true } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fallback: compute live stats
    const [providers, challenges, certifications, industries] = await Promise.all([
      supabase
        .from('solution_providers')
        .select('id', { count: 'exact', head: true })
        .eq('lifecycle_status', 'active'),
      supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('is_active', true),
      supabase
        .from('provider_certifications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('industry_segments')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
    ])

    const stats = {
      active_providers: providers.count ?? 0,
      active_challenges: challenges.count ?? 0,
      active_certifications: certifications.count ?? 0,
      industry_segments: industries.count ?? 0,
    }

    // 3. Upsert cache
    const computedAt = new Date().toISOString()
    const cacheRows = Object.entries(stats).map(([key, value]) => ({
      stat_key: key,
      stat_value: value,
      computed_at: computedAt,
    }))

    for (const row of cacheRows) {
      await supabase
        .from('platform_stats_cache')
        .upsert(row, { onConflict: 'stat_key' })
    }

    return new Response(
      JSON.stringify({ success: true, data: { stats, cached: false } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('public-platform-stats error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'STATS_ERROR', message: String(error) } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
