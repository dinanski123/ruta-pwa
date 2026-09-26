export default async function handler(_req, res) {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch("https://sfaeomnpyhenszrkgguh.supabase.co/auth/v1/health", {
      headers: { Accept: "application/json" }
    });
    res.status(200).json({
      ok: response.ok,
      supabase_status: response.status,
      checked_at: checkedAt,
      schedule: "Monday, Wednesday, Friday at 03:00 UTC"
    });
  } catch (error) {
    res.status(200).json({
      ok: false,
      supabase_status: null,
      checked_at: checkedAt,
      schedule: "Monday, Wednesday, Friday at 03:00 UTC",
      error: error instanceof Error ? error.message : "Health check failed"
    });
  }
}
