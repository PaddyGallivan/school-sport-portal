var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-School-Key"
};
var PATHWAY = ["School", "District", "Division", "Region", "State"];
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname === "/health") {
      return json({ ok: true, worker: "school-sport-portal", version: "1.0", ts: /* @__PURE__ */ new Date() });
    }
    if (url.pathname === "/" || url.pathname === "/portal") {
      return servePortalHome();
    }
    if (url.pathname === "/coordinator") {
      return serveCoordinatorDash();
    }
    if (url.pathname === "/convenor") {
      return serveConvenorDash();
    }
    if (url.pathname === "/carnival") {
      return serveCarnivalApp(url);
    }
    if (url.pathname === "/timing") {
      return serveTimingRedirect();
    }
    if (url.pathname === "/api/schools") {
      if (!env.DB) return json({ error: "DB not configured" }, 500);
      const { results } = await env.DB.prepare(
        "SELECT * FROM schools ORDER BY district, name"
      ).all().catch(() => ({ results: [] }));
      return json({ schools: results, total: results.length });
    }
    if (url.pathname === "/api/carnivals") {
      if (!env.DB) return json({ error: "DB not configured" }, 500);
      const { results } = await env.DB.prepare(
        "SELECT * FROM carnivals ORDER BY date DESC LIMIT 50"
      ).all().catch(() => ({ results: [] }));
      return json({ carnivals: results });
    }
    if (url.pathname === "/api/schools/register" && request.method === "POST") {
      if (!env.DB) return json({ error: "DB not configured" }, 500);
      const body = await request.json();
      const { name, district, suburb, contact_email } = body;
      if (!name || !district) return json({ error: "name and district required" }, 400);
      await env.DB.prepare(
        "INSERT INTO schools (name, district, suburb, contact_email, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(name, district, suburb || "", contact_email || "", (/* @__PURE__ */ new Date()).toISOString()).run();
      return json({ ok: true, message: `${name} registered in ${district} District` });
    }
    if (url.pathname === "/api/qualifiers") {
      if (!env.DB) return json({ error: "DB not configured" }, 500);
      const level = url.searchParams.get("level") || "District";
      const { results } = await env.DB.prepare(
        "SELECT * FROM qualifiers WHERE next_level = ? ORDER BY event, result_value"
      ).bind(level).all().catch(() => ({ results: [] }));
      return json({ qualifiers: results, level });
    }
    if (url.pathname === "/api/pathway") {
      if (!env.DB) return json({ error: "DB not configured" }, 500);
      const stats = {};
      for (const level of PATHWAY) {
        const count = await env.DB.prepare(
          "SELECT COUNT(*) as n FROM qualifiers WHERE current_level = ?"
        ).bind(level).first().catch(() => ({ n: 0 }));
        stats[level] = count.n || 0;
      }
      return json({ pathway: stats });
    }
    return json({ error: "Not found", endpoints: ["/", "/coordinator", "/convenor", "/carnival", "/timing", "/api/schools", "/api/carnivals", "/api/qualifiers", "/api/pathway"] }, 404);
  }
};
function servePortalHome() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>School Sport Portal \u2014 Victoria</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F0F4F8; color: #1B2A4A; }
  header {
    background: linear-gradient(135deg, #1B2A4A 0%, #0D9488 100%);
    color: white; padding: 40px 24px; text-align: center;
  }
  .logo { font-size: 48px; margin-bottom: 12px; }
  h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; }
  .sub { font-size: 16px; opacity: 0.85; margin-bottom: 32px; }
  .hero-stats { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; margin-top: 20px; }
  .stat { background: rgba(255,255,255,0.15); border-radius: 12px; padding: 14px 24px; text-align: center; }
  .stat-n { font-size: 28px; font-weight: 900; }
  .stat-l { font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }

  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; padding: 32px 24px; max-width: 1200px; margin: 0 auto; }
  .card {
    background: white; border-radius: 16px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    text-decoration: none; color: inherit; display: block;
    border-top: 4px solid transparent; transition: all 0.2s;
  }
  .card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
  .card.coordinator { border-top-color: #1B2A4A; }
  .card.convenor { border-top-color: #0D9488; }
  .card.carnival { border-top-color: #F59E0B; }
  .card.timing { border-top-color: #8B5CF6; }
  .card-icon { font-size: 36px; margin-bottom: 16px; }
  .card-title { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
  .card-desc { font-size: 14px; color: #64748B; line-height: 1.6; margin-bottom: 20px; }
  .card-btn {
    display: inline-block; padding: 10px 20px; border-radius: 8px;
    font-weight: 700; font-size: 14px; color: white;
  }
  .card.coordinator .card-btn { background: #1B2A4A; }
  .card.convenor .card-btn { background: #0D9488; }
  .card.carnival .card-btn { background: #F59E0B; }
  .card.timing .card-btn { background: #8B5CF6; }

  .pathway { background: white; margin: 0 24px 32px; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); max-width: 1152px; }
  .pathway-title { font-size: 18px; font-weight: 800; margin-bottom: 20px; color: #1B2A4A; }
  .pathway-steps { display: flex; align-items: center; justify-content: space-between; gap: 8px; overflow-x: auto; }
  .step { text-align: center; flex: 1; min-width: 80px; }
  .step-circle { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: white; }
  .step-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .step-arrow { font-size: 24px; color: #CBD5E1; flex-shrink: 0; }

  footer { text-align: center; padding: 40px 24px; color: #94A3B8; font-size: 13px; }
</style>
</head>
<body>
<header>
  <div class="logo">\u{1F3C3}\u200D\u2642\uFE0F</div>
  <h1>School Sport Portal</h1>
  <p class="sub">Victorian primary school sport management \xB7 District to State pathway</p>
  <div class="hero-stats">
    <div class="stat"><div class="stat-n">1,070+</div><div class="stat-l">Carnivals/year</div></div>
    <div class="stat"><div class="stat-n">5</div><div class="stat-l">Pathway levels</div></div>
    <div class="stat"><div class="stat-n">3</div><div class="stat-l">Carnival types</div></div>
    <div class="stat"><div class="stat-n">Free</div><div class="stat-l">For schools</div></div>
  </div>
</header>

<div style="max-width:1200px;margin:0 auto">
  <div class="pathway" style="margin-top:32px">
    <div class="pathway-title">\u{1F3C6} Victorian Pathway</div>
    <div class="pathway-steps">
      <div class="step">
        <div class="step-circle" style="background:#1B2A4A">\u{1F3EB}</div>
        <div class="step-label">School</div>
      </div>
      <div class="step-arrow">\u2192</div>
      <div class="step">
        <div class="step-circle" style="background:#0D9488">\u{1F5FA}\uFE0F</div>
        <div class="step-label">District</div>
      </div>
      <div class="step-arrow">\u2192</div>
      <div class="step">
        <div class="step-circle" style="background:#F59E0B">\u26A1</div>
        <div class="step-label">Division</div>
      </div>
      <div class="step-arrow">\u2192</div>
      <div class="step">
        <div class="step-circle" style="background:#8B5CF6">\u{1F30D}</div>
        <div class="step-label">Region</div>
      </div>
      <div class="step-arrow">\u2192</div>
      <div class="step">
        <div class="step-circle" style="background:#DC2626">\u{1F3C6}</div>
        <div class="step-label">State</div>
      </div>
    </div>
  </div>
</div>

<div class="cards">
  <a href="/coordinator" class="card coordinator">
    <div class="card-icon">\u{1F469}\u200D\u{1F3EB}</div>
    <div class="card-title">School Coordinator</div>
    <div class="card-desc">Manage your school's students, enter carnival results, track qualifications to district and beyond.</div>
    <span class="card-btn">Open Dashboard \u2192</span>
  </a>

  <a href="/convenor" class="card convenor">
    <div class="card-icon">\u{1F4CB}</div>
    <div class="card-title">Convenor Dashboard</div>
    <div class="card-desc">Manage district/division carnivals, process school entries, publish results, qualify athletes.</div>
    <span class="card-btn">Open Dashboard \u2192</span>
  </a>

  <a href="/carnival" class="card carnival">
    <div class="card-icon">\u{1F3C5}</div>
    <div class="card-title">Run a Carnival</div>
    <div class="card-desc">Live results entry for athletics, swimming, and cross country. Multi-device, real-time Firebase sync.</div>
    <span class="card-btn">Start Carnival \u2192</span>
  </a>

  <a href="/timing" class="card timing">
    <div class="card-icon">\u23F1\uFE0F</div>
    <div class="card-title">FinishLine Timing</div>
    <div class="card-desc">Crowd-sourced lane timing. Parents tap at the finish line \u2014 trimmed-mean averaging. QR code join.</div>
    <span class="card-btn">Open Timing \u2192</span>
  </a>
</div>

<footer>
  \u{1F3C3}\u200D\u2642\uFE0F School Sport Portal \xB7 Built for Victorian primary schools<br>
  <span>Free for schools \xB7 schoolsportportal.com \xB7 sportcarnival.com.au</span>
</footer>
<script>window.ASGARD_AI_APP='school-sport-portal';window.ASGARD_AI_TITLE='Sport Portal AI';window.ASGARD_AI_COLOR='#0D9488'<\/script><script src="https://asgard-ai.pgallivan.workers.dev/widget.js"><\/script></body>
</html>`, { headers: { "Content-Type": "text/html", ...CORS } });
}
__name(servePortalHome, "servePortalHome");
function serveCoordinatorDash() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>School Coordinator \u2014 School Sport Portal</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F0F4F8; }
  .header { background: #1B2A4A; color: white; padding: 16px 20px; display: flex; align-items: center; gap: 12px; }
  .back { background: rgba(255,255,255,0.15); border: none; color: white; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; text-decoration: none; font-size: 14px; }
  h1 { font-size: 20px; font-weight: 800; flex: 1; }
  .content { padding: 20px; max-width: 800px; margin: 0 auto; }
  .card { background: white; border-radius: 14px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
  .card-title { font-size: 16px; font-weight: 800; color: #1B2A4A; margin-bottom: 12px; }
  .stat-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
  .stat { background: #F8FAFC; border-radius: 10px; padding: 14px; text-align: center; }
  .stat-n { font-size: 28px; font-weight: 900; color: #0D9488; }
  .stat-l { font-size: 11px; color: #94A3B8; text-transform: uppercase; margin-top: 4px; }
  .btn { padding: 14px 20px; border-radius: 10px; border: none; font-weight: 800; cursor: pointer; font-size: 15px; width: 100%; margin-bottom: 10px; text-align: left; }
  .btn-primary { background: #1B2A4A; color: white; }
  .btn-teal { background: #0D9488; color: white; }
  .btn-amber { background: #F59E0B; color: white; }
  .btn-purple { background: #8B5CF6; color: white; }
  .pill { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; margin: 2px; }
  .pill-green { background: #D1FAE5; color: #065F46; }
  .pill-blue { background: #DBEAFE; color: #1E40AF; }
  .pill-amber { background: #FEF3C7; color: #92400E; }
</style>
</head>
<body>
<div class="header">
  <a href="/" class="back">\u2190 Back</a>
  <h1>\u{1F469}\u200D\u{1F3EB} School Coordinator</h1>
</div>
<div class="content">

  <div class="card">
    <div class="card-title">\u{1F4CA} Williamstown Primary School</div>
    <div class="stat-row">
      <div class="stat"><div class="stat-n">272</div><div class="stat-l">Students</div></div>
      <div class="stat"><div class="stat-n">3</div><div class="stat-l">Carnivals</div></div>
      <div class="stat"><div class="stat-n">12</div><div class="stat-l">Qualifiers</div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">\u{1F3C3} Quick Actions</div>
    <button class="btn btn-primary" onclick="window.location='/carnival'">\u{1F3C5} Run a Carnival</button>
    <button class="btn btn-teal" onclick="window.location='/timing'">\u23F1\uFE0F Open Timing App</button>
    <button class="btn btn-amber" onclick="alert('Team sports fixtures coming soon!')">\u{1F4C5} View Fixtures</button>
    <button class="btn btn-purple" onclick="alert('District pathway tracking coming soon!')">\u{1F3C6} District Pathway</button>
  </div>

  <div class="card">
    <div class="card-title">\u2705 Recent Qualifiers \u2192 District</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      <span class="pill pill-green">\u{1F3C3} 100m Boys 10</span>
      <span class="pill pill-green">\u{1F3C3} 200m Girls 11</span>
      <span class="pill pill-blue">\u{1F998} Long Jump Boys 11</span>
      <span class="pill pill-blue">\u{1F3D0} Shot Put Girls 12</span>
      <span class="pill pill-amber">\u{1F3CA} 50m Boys 10 (Swimming)</span>
      <span class="pill pill-amber">\u{1F3CA} 100m Girls 11 (Swimming)</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">\u{1F4C5} Upcoming</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#F8FAFC;border-radius:8px">
        <div style="font-size:24px">\u{1F3C3}</div>
        <div>
          <div style="font-weight:700;font-size:14px">Williamstown District Athletics</div>
          <div style="font-size:12px;color:#94A3B8">Term 3, Week 5 \xB7 Symons Reserve</div>
        </div>
        <span class="pill pill-green" style="margin-left:auto">Confirmed</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#F8FAFC;border-radius:8px">
        <div style="font-size:24px">\u{1F3CA}</div>
        <div>
          <div style="font-weight:700;font-size:14px">Hobsons Bay Division Swimming</div>
          <div style="font-size:12px;color:#94A3B8">Term 1, Week 8 \xB7 MSAC</div>
        </div>
        <span class="pill pill-amber" style="margin-left:auto">Pending</span>
      </div>
    </div>
  </div>
</div>
<script>window.ASGARD_AI_APP='school-sport-portal';window.ASGARD_AI_TITLE='Sport Portal AI';window.ASGARD_AI_COLOR='#0D9488'<\/script><script src="https://asgard-ai.pgallivan.workers.dev/widget.js"><\/script></body>
</html>`, { headers: { "Content-Type": "text/html", ...CORS } });
}
__name(serveCoordinatorDash, "serveCoordinatorDash");
function serveConvenorDash() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Convenor Dashboard \u2014 School Sport Portal</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F0F4F8; }
  .header { background: #0D9488; color: white; padding: 16px 20px; display: flex; align-items: center; gap: 12px; }
  .back { background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; text-decoration: none; font-size: 14px; }
  h1 { font-size: 20px; font-weight: 800; flex: 1; }
  .content { padding: 20px; max-width: 900px; margin: 0 auto; }
  .card { background: white; border-radius: 14px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
  .card-title { font-size: 16px; font-weight: 800; color: #1B2A4A; margin-bottom: 14px; }
  .school-row { display: flex; align-items: center; gap: 12px; padding: 12px; background: #F8FAFC; border-radius: 10px; margin-bottom: 8px; }
  .school-num { font-size: 22px; font-weight: 900; color: #0D9488; min-width: 40px; }
  .school-name { font-weight: 700; font-size: 14px; flex: 1; }
  .school-count { font-size: 12px; color: #94A3B8; }
  .pill { display: inline-block; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
  .pill-green { background: #D1FAE5; color: #065F46; }
  .pill-blue { background: #DBEAFE; color: #1E40AF; }
  .btn { padding: 12px 18px; border-radius: 10px; border: none; font-weight: 800; cursor: pointer; font-size: 14px; background: #0D9488; color: white; width: 100%; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(140px,1fr)); gap: 10px; margin-bottom: 16px; }
  .stat { background: #F8FAFC; border-radius: 10px; padding: 14px; text-align: center; }
  .stat-n { font-size: 26px; font-weight: 900; color: #0D9488; }
  .stat-l { font-size: 11px; color: #94A3B8; text-transform: uppercase; margin-top: 4px; }
</style>
</head>
<body>
<div class="header">
  <a href="/" class="back">\u2190 Back</a>
  <h1>\u{1F4CB} Convenor Dashboard</h1>
</div>
<div class="content">

  <div class="card">
    <div class="card-title">\u{1F4CA} Williamstown District \u2014 Athletics 2026</div>
    <div class="grid">
      <div class="stat"><div class="stat-n">14</div><div class="stat-l">Schools Entered</div></div>
      <div class="stat"><div class="stat-n">847</div><div class="stat-l">Athletes</div></div>
      <div class="stat"><div class="stat-n">24</div><div class="stat-l">Events</div></div>
      <div class="stat"><div class="stat-n">61</div><div class="stat-l">Qualifying \u2192 Division</div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">\u{1F3EB} School Entries</div>
    ${[
    "Williamstown Primary",
    "Altona Primary",
    "Newport Primary",
    "Laverton P-12",
    "Seaholme Primary",
    "Point Cook Primary",
    "Williamstown North",
    "Cherry Lake Primary"
  ].map((s, i) => `
    <div class="school-row">
      <div class="school-num">${i + 1}</div>
      <div>
        <div class="school-name">${s}</div>
        <div class="school-count">${Math.floor(Math.random() * 40) + 30} athletes across ${Math.floor(Math.random() * 6) + 4} events</div>
      </div>
      <span class="pill ${i < 5 ? "pill-green" : "pill-blue"}">${i < 5 ? "Submitted" : "Pending"}</span>
    </div>`).join("")}
  </div>

  <div class="card">
    <div class="card-title">\u26A1 Actions</div>
    <button class="btn" onclick="alert('Publishig results \u2014 coming soon!')">\u{1F4E4} Publish Results to Division</button>
    <button class="btn" style="background:#1B2A4A" onclick="window.location='/carnival'">\u{1F3C5} Open Live Results Entry</button>
    <button class="btn" style="background:#F59E0B" onclick="alert('Qualifier list export coming soon!')">\u{1F4CB} Export Qualifier List</button>
  </div>

</div>
<script>window.ASGARD_AI_APP='school-sport-portal';window.ASGARD_AI_TITLE='Sport Portal AI';window.ASGARD_AI_COLOR='#0D9488'<\/script><script src="https://asgard-ai.pgallivan.workers.dev/widget.js"><\/script></body>
</html>`, { headers: { "Content-Type": "text/html", ...CORS } });
}
__name(serveConvenorDash, "serveConvenorDash");
function serveCarnivalApp(url) {
  return Response.redirect("https://paddygallivan.github.io/school-sport-hub/", 302);
}
__name(serveCarnivalApp, "serveCarnivalApp");
function serveTimingRedirect() {
  return Response.redirect("https://paddygallivan.github.io/district-sport/timing.html", 302);
}
__name(serveTimingRedirect, "serveTimingRedirect");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}
__name(json, "json");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map