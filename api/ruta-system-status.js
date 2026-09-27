export default async function handler(req, res) {
  const checkedAt = new Date().toISOString();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_fVzhqEUloMaYijWLniImmQ_rtSXnyDr";

  const origin =
    req?.headers?.["x-forwarded-proto"] && req?.headers?.["x-forwarded-host"]
      ? `${req.headers["x-forwarded-proto"]}://${req.headers["x-forwarded-host"]}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null;

  const base = {
    checked_at: checkedAt,
    schedule: "Monday, Wednesday, Friday at 03:00 UTC",
    project: "RUTA",
    origin,
    environment: process.env.VERCEL_ENV || "production",
    region: process.env.VERCEL_REGION || null,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA
      ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8)
      : null
  };

  const supabasePromise = fetch("https://sfaeomnpyhenszrkgguh.supabase.co/auth/v1/health", {
    headers: {
      Accept: "application/json",
      apikey: publishableKey
    },
    cache: "no-store"
  }).then(async response => {
    let details = null;
    try {
      details = await response.json();
    } catch {
      // Keep the response usable if Supabase returns a non-JSON body.
    }
    return {
      ok: response.ok,
      status: response.status,
      details
    };
  }).catch(error => ({
    ok: false,
    status: null,
    error: error instanceof Error ? error.message : "Health check failed"
  }));

  const trafficPromise = getTraffic24h();

  const [supabase, traffic] = await Promise.all([supabasePromise, trafficPromise]);

  res.status(200).json({
    ...base,
    ok: supabase.ok,
    supabase_status: supabase.status,
    supabase,
    traffic
  });
}

async function getTraffic24h() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return {
      available: false,
      source: "Vercel Web Analytics",
      reason: "Set VERCEL_TOKEN to show traffic in RUTA."
    };
  }

  try {
    const projectId = process.env.VERCEL_PROJECT_ID || await findProjectId(token);
    if (!projectId) {
      return {
        available: false,
        source: "Vercel Web Analytics",
        reason: "Vercel project ID was not found."
      };
    }

    const teamId = process.env.VERCEL_TEAM_ID || "team_UQBGgOv8y56MG4RhkoyDF2oo";
    const params = new URLSearchParams({
      projectId,
      ...(teamId ? { teamId } : {})
    });

    const response = await fetch(
      `https://api.vercel.com/v1/query/web-analytics/visits/count?${params}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      return {
        available: false,
        source: "Vercel Web Analytics",
        reason: `Vercel API returned ${response.status}.`
      };
    }

    const data = await response.json();
    return {
      available: true,
      source: "Vercel Web Analytics",
      page_views: typeof data === "number" ? data : data?.count ?? data?.total ?? null,
      note: "Page views are not the same as Vercel Edge Requests."
    };
  } catch (error) {
    return {
      available: false,
      source: "Vercel Web Analytics",
      reason: error instanceof Error ? error.message : "Traffic lookup failed"
    };
  }
}

async function findProjectId(token) {
  const teamId = process.env.VERCEL_TEAM_ID;
  const params = new URLSearchParams(teamId ? { teamId } : {});
  const response = await fetch(
    `https://api.vercel.com/v9/projects/ruta-pwa?${params}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data?.id || null;
}
