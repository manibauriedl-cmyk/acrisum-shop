/** Acrisum — Besucherzähler (immer erreichbar, Log in KV). */
const MAX_EREIGNISSE = 300;
const SEITE_OK = /^[a-z0-9_-]{1,40}$/i;

function leer() {
  return {
    setup_clicks: 0,
    testcode_clicks: 0,
    aufrufe_gesamt: 0,
    seitenaufrufe: {},
    ereignisse: [],
    stand: "",
    hinweis: "Cloud-Zähler (Worker)",
  };
}

function jetztIso() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    p(d.getMonth() + 1) +
    "-" +
    p(d.getDate()) +
    " " +
    p(d.getHours()) +
    ":" +
    p(d.getMinutes()) +
    ":" +
    p(d.getSeconds())
  );
}

function jetztAnzeige() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    p(d.getDate()) +
    "." +
    p(d.getMonth() + 1) +
    "." +
    d.getFullYear() +
    " " +
    p(d.getHours()) +
    ":" +
    p(d.getMinutes()) +
    ":" +
    p(d.getSeconds())
  );
}

function payload(data) {
  const stand = data.stand || "";
  let standDe = "";
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(stand);
  if (m) standDe = "Stand " + m[3] + "." + m[2] + "." + m[1] + ", " + m[4] + ":" + m[5];
  return {
    ok: true,
    setup_clicks: Number(data.setup_clicks || 0),
    testcode_clicks: Number(data.testcode_clicks || 0),
    aufrufe_gesamt: Number(data.aufrufe_gesamt || 0),
    seitenaufrufe: data.seitenaufrufe || {},
    stand,
    stand_de: standDe,
    ereignisse: (data.ereignisse || []).slice(0, MAX_EREIGNISSE),
    quelle: "cloud-worker",
  };
}

async function readState(env) {
  const raw = await env.ACRISUM_STATS.get("data");
  if (!raw) return leer();
  try {
    const d = JSON.parse(raw);
    return d && typeof d === "object" ? d : leer();
  } catch (e) {
    return leer();
  }
}

async function writeState(env, data) {
  await env.ACRISUM_STATS.put("data", JSON.stringify(data));
}

async function appendLog(env, line) {
  const prev = (await env.ACRISUM_STATS.get("access_log")) || "";
  await env.ACRISUM_STATS.put("access_log", (prev + line).slice(-80000));
}

function istTestcode(typ, quelle, testcode) {
  if (testcode) return true;
  if (typ === "testcode" || typ === "test") return true;
  const q = String(quelle || "").toLowerCase();
  return q === "testcode" || q === "test-code" || q === "test_code";
}

function increment(data, body) {
  const typ = String(body.typ || "").toLowerCase();
  const seite = String(body.seite || "").toLowerCase();
  const quelle = String(body.quelle || "").trim();
  const testcode = !!body.testcode;
  const istSeite =
    typ === "seite" || typ === "page" || typ === "aufruf" || (seite && !istTestcode(typ, quelle, testcode));

  const jetzt = jetztIso();
  data.stand = jetzt;
  const liste = Array.isArray(data.ereignisse) ? data.ereignisse : [];
  data.ereignisse = liste;

  if (istSeite) {
    let key = seite || "sonst";
    if (!SEITE_OK.test(key)) key = "sonst";
    const views = data.seitenaufrufe && typeof data.seitenaufrufe === "object" ? data.seitenaufrufe : {};
    views[key] = Number(views[key] || 0) + 1;
    data.seitenaufrufe = views;
    data.aufrufe_gesamt = Number(data.aufrufe_gesamt || 0) + 1;
    data.letzte_seite = key;
    liste.unshift({ typ: "seite", seite: key, zeit: jetzt, zeit_anzeige: jetztAnzeige() });
  } else if (istTestcode(typ, quelle, testcode)) {
    data.testcode_clicks = Number(data.testcode_clicks || 0) + 1;
    liste.unshift({
      typ: "testcode",
      quelle: (quelle || "testcode").slice(0, 80),
      zeit: jetzt,
      zeit_anzeige: jetztAnzeige(),
    });
  } else {
    data.setup_clicks = Number(data.setup_clicks || 0) + 1;
    liste.unshift({
      typ: "setup",
      quelle: (quelle || "setup").slice(0, 80),
      zeit: jetzt,
      zeit_anzeige: jetztAnzeige(),
    });
  }
  if (liste.length > MAX_EREIGNISSE) data.ereignisse = liste.slice(0, MAX_EREIGNISSE);
  return data;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ---------- xx1lounger Fehlerbericht (opt-in: Kunde sieht Text, drückt selbst Senden) ----------
const BERICHT_MAX_BYTES = 64 * 1024;
const BERICHT_MAX_IP_TAG = 10; // Blockade, wenn einer 100x drückt
const BERICHT_MAX_TAG = 500; // globale Flut-Bremse pro Tag
const BERICHT_MAX_LISTE = 300; // Ringpuffer im KV

async function berichtPost(request, env) {
  if (await env.ACRISUM_STATS.get("bericht_aus")) {
    return Response.json(
      { ok: false, hinweis: "Fehlerbericht-Eingang ist derzeit abgeschaltet." },
      { status: 503, headers: cors }
    );
  }
  const ip = request.headers.get("CF-Connecting-IP") || "?";
  const tag = jetztIso().slice(0, 10);
  const tagKey = "bericht_tag:" + tag;
  const ipKey = "bericht_ip:" + tag + ":" + ip;
  const tagN = Number((await env.ACRISUM_STATS.get(tagKey)) || 0);
  const ipN = Number((await env.ACRISUM_STATS.get(ipKey)) || 0);
  if (tagN >= BERICHT_MAX_TAG || ipN >= BERICHT_MAX_IP_TAG) {
    return Response.json({ ok: false, hinweis: "Limit erreicht." }, { status: 429, headers: cors });
  }
  let text = await request.text();
  if (text.length > BERICHT_MAX_BYTES) text = text.slice(0, BERICHT_MAX_BYTES);
  let berichte = [];
  try {
    berichte = JSON.parse((await env.ACRISUM_STATS.get("berichte")) || "[]");
  } catch (e) {}
  berichte.unshift({ zeit: jetztIso(), zeit_anzeige: jetztAnzeige(), ip, text });
  if (berichte.length > BERICHT_MAX_LISTE) berichte.length = BERICHT_MAX_LISTE;
  await env.ACRISUM_STATS.put("berichte", JSON.stringify(berichte));
  await env.ACRISUM_STATS.put(tagKey, String(tagN + 1), { expirationTtl: 172800 });
  await env.ACRISUM_STATS.put(ipKey, String(ipN + 1), { expirationTtl: 172800 });
  await appendLog(env, jetztIso() + "\tbericht\t-\t" + ip + "\n");
  return Response.json({ ok: true }, { headers: cors });
}

async function berichtGet(url, env) {
  const key = url.searchParams.get("key") || "";
  if (!env.BERICHT_LESEKEY || key !== env.BERICHT_LESEKEY) {
    return new Response("forbidden", { status: 403, headers: cors });
  }
  if (url.searchParams.get("aus") === "1") {
    await env.ACRISUM_STATS.put("bericht_aus", "1");
    return new Response("bericht-eingang AUS", { headers: cors });
  }
  if (url.searchParams.get("an") === "1") {
    await env.ACRISUM_STATS.delete("bericht_aus");
    return new Response("bericht-eingang AN", { headers: cors });
  }
  if (url.searchParams.get("loeschen") === "1") {
    await env.ACRISUM_STATS.put("berichte", "[]");
    return new Response("berichte geleert", { headers: cors });
  }
  const aus = !!(await env.ACRISUM_STATS.get("bericht_aus"));
  const raw = (await env.ACRISUM_STATS.get("berichte")) || "[]";
  return new Response('{"eingang_aus":' + aus + ',"berichte":' + raw + "}", {
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (url.pathname === "/api/acrisum-access-log" && request.method === "GET") {
      const log = (await env.ACRISUM_STATS.get("access_log")) || "";
      return new Response(log, { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
    }
    if (url.pathname === "/api/xx1lounger-bericht" && request.method === "POST") {
      return berichtPost(request, env);
    }
    if (url.pathname === "/api/xx1lounger-berichte" && request.method === "GET") {
      return berichtGet(url, env);
    }
    if (url.pathname !== "/api/acrisum-downloads") {
      return new Response("not found", { status: 404, headers: cors });
    }
    if (request.method === "GET") {
      return Response.json(payload(await readState(env)), { headers: cors });
    }
    if (request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {}
      const data = increment(await readState(env), body || {});
      await writeState(env, data);
      await appendLog(
        env,
        jetztIso() + "\t" + (body.typ || "") + "\t" + (body.seite || "") + "\t" + (body.quelle || "") + "\n"
      );
      return Response.json(payload(data), { headers: cors });
    }
    return new Response("method not allowed", { status: 405, headers: cors });
  },
};
