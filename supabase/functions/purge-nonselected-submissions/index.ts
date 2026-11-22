// J19 — daily confidential submission purge (04:00 UTC).
// Clears non-selected content via the server step, then removes stored files.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "solution-files";
const BATCH = 100;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const correlationId = crypto.randomUUID();
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: counts, error } = await admin.rpc("purge_nonselected_submissions");
    if (error) throw error;

    const { data: pending, error: qErr } = await admin
      .from("submission_purge_log")
      .select("id, file_paths")
      .is("files_removed_at", null)
      .limit(BATCH);
    if (qErr) throw qErr;

    let filesRemoved = 0;
    for (const row of pending ?? []) {
      const paths = (row.file_paths ?? []) as string[];
      if (paths.length > 0) {
        const { error: rmErr } = await admin.storage.from(BUCKET).remove(paths);
        if (rmErr) {
          console.error(JSON.stringify({ correlationId, id: row.id, msg: rmErr.message }));
          continue;
        }
        filesRemoved += paths.length;
      }
      await admin.from("submission_purge_log")
        .update({ files_removed_at: new Date().toISOString() }).eq("id", row.id);
    }
    return json({ success: true, data: { purged: counts, filesRemoved } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(JSON.stringify({ correlationId, message }));
    return json({ success: false, error: { code: "PURGE_FAILED", message, correlationId } }, 500);
  }
});
