const SESSION_COOKIE = "klati_session";
const SESSION_TTL = 60 * 60 * 24 * 7;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"content-type": "application/json; charset=utf-8"}
  });
}

function html(text, status = 200) {
  return new Response(text, {
    status,
    headers: {"content-type": "text/html; charset=utf-8"}
  });
}

function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}

function unb64url(s) {
  s = s.replaceAll("-","+").replaceAll("_","/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    {name:"HMAC", hash:"SHA-256"}, false, ["sign","verify"]
  );
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
}

async function makeSession(secret) {
  const payload = JSON.stringify({exp: Math.floor(Date.now()/1000)+SESSION_TTL});
  const p = b64url(new TextEncoder().encode(payload));
  const sig = b64url(await hmac(secret, p));
  return `${p}.${sig}`;
}

async function validSession(request, secret) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!m) return false;
  const [p, sig] = m[1].split(".");
  if (!p || !sig) return false;
  try {
    const expected = new Uint8Array(await hmac(secret, p));
    const got = unb64url(sig);
    if (expected.length !== got.length) return false;
    let diff = 0;
    for (let i=0;i<expected.length;i++) diff |= expected[i] ^ got[i];
    if (diff !== 0) return false;
    const payload = JSON.parse(new TextDecoder().decode(unb64url(p)));
    return payload.exp > Math.floor(Date.now()/1000);
  } catch { return false; }
}

function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_TTL}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

async function requireAuth(request, env) {
  return validSession(request, env.SESSION_SECRET || "");
}

async function publicPosts(env) {
  const {results} = await env.DB.prepare(
    `SELECT id, slug, title, excerpt, body, cover_url, category, published_at
     FROM posts WHERE status='published'
     ORDER BY published_at DESC, id DESC`
  ).all();
  return results;
}

async function adminPosts(env) {
  const {results} = await env.DB.prepare(
    `SELECT id, slug, title, excerpt, body, cover_url, category, status, published_at, created_at, updated_at
     FROM posts ORDER BY COALESCE(published_at, created_at) DESC, id DESC`
  ).all();
  return results;
}

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/[áàäâ]/g,"a").replace(/[éèëê]/g,"e")
    .replace(/[íìïî]/g,"i").replace(/[óòöô]/g,"o")
    .replace(/[úùüû]/g,"u").replace(/[^a-z0-9а-яё]+/gi,"-")
    .replace(/^-+|-+$/g,"").slice(0,90) || `post-${Date.now()}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/posts" && request.method === "GET") {
        return json(await publicPosts(env));
      }

      if (path.startsWith("/api/posts/") && request.method === "GET") {
        const slug = decodeURIComponent(path.slice("/api/posts/".length));
        const post = await env.DB.prepare(
          `SELECT id, slug, title, excerpt, body, cover_url, category, published_at
           FROM posts WHERE slug=?1 AND status='published' LIMIT 1`
        ).bind(slug).first();
        return post ? json(post) : json({error:"Not found"},404);
      }

      if (path === "/api/admin/login" && request.method === "POST") {
        const body = await request.json();
        const password = String(body.password || "");
        if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
          return json({error:"Грешна парола."},401);
        }
        const session = await makeSession(env.SESSION_SECRET);
        return new Response(JSON.stringify({ok:true}), {
          headers: {
            "content-type":"application/json",
            "set-cookie":sessionCookie(session)
          }
        });
      }

      if (path === "/api/admin/logout" && request.method === "POST") {
        return new Response(JSON.stringify({ok:true}), {
          headers: {"content-type":"application/json","set-cookie":clearCookie()}
        });
      }

      if (path.startsWith("/api/admin/")) {
        if (!(await requireAuth(request, env))) return json({error:"Неоторизиран достъп."},401);

        if (path === "/api/admin/posts" && request.method === "GET") {
          return json(await adminPosts(env));
        }

        if (path === "/api/admin/posts" && request.method === "POST") {
          const b = await request.json();
          const title = String(b.title||"").trim();
          const body = String(b.body||"").trim();
          if (!title || !body) return json({error:"Заглавието и текстът са задължителни."},400);
          const slug = String(b.slug||slugify(title)).trim();
          const status = b.status === "published" ? "published" : "draft";
          const now = new Date().toISOString();
          const published = status === "published" ? now : null;
          await env.DB.prepare(
            `INSERT INTO posts (slug,title,excerpt,body,cover_url,category,status,published_at,created_at,updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)`
          ).bind(slug,title,String(b.excerpt||""),body,String(b.cover_url||""),String(b.category||"Писаници"),status,published,now).run();
          return json({ok:true});
        }

        const match = path.match(/^\/api\/admin\/posts\/(\d+)$/);
        if (match && (request.method === "PUT" || request.method === "DELETE")) {
          const id = Number(match[1]);
          if (request.method === "DELETE") {
            await env.DB.prepare(`DELETE FROM posts WHERE id=?1`).bind(id).run();
            return json({ok:true});
          }
          const b = await request.json();
          const title = String(b.title||"").trim();
          const body = String(b.body||"").trim();
          if (!title || !body) return json({error:"Заглавието и текстът са задължителни."},400);
          const status = b.status === "published" ? "published" : "draft";
          const published = status === "published" ? (b.published_at || new Date().toISOString()) : null;
          await env.DB.prepare(
            `UPDATE posts SET slug=?1,title=?2,excerpt=?3,body=?4,cover_url=?5,category=?6,status=?7,published_at=?8,updated_at=?9 WHERE id=?10`
          ).bind(String(b.slug||slugify(title)),title,String(b.excerpt||""),body,String(b.cover_url||""),String(b.category||"Писаници"),status,published,new Date().toISOString(),id).run();
          return json({ok:true});
        }
      }

      if (path === "/admin") {
        if (!(await requireAuth(request, env))) {
          return html(await env.ASSETS.fetch(new Request(new URL("/admin-login.html",url))).then(r=>r.text()));
        }
        return env.ASSETS.fetch(new Request(new URL("/admin.html",url)));
      }

      return env.ASSETS.fetch(request);
    } catch (e) {
      return json({error:"Server error", detail:String(e?.message||e)},500);
    }
  }
};
