export default async function handler(_req, res) {
  const supabaseUrl = "https://sfaeomnpyhenszrkgguh.supabase.co";

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    res.status(200).json({
      ok: response.ok,
      supabase_status: response.status,
      checked_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({
      ok: false,
      error: error instanceof Error ? error.message : "Supabase health check failed",
      checked_at: new Date().toISOString()
    });
  }
}
