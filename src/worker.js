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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatBody(value = "") {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderPostPage(post) {
  const title = escapeHtml(post.title);
  const category = escapeHtml(post.category || "ПИСАНИЦИ");
  const excerpt = escapeHtml(post.excerpt || "");
  const body = formatBody(post.body || "");
  const cover = post.cover_url
    ? `<img class="cover" src="${escapeHtml(post.cover_url)}" alt="${title}">`
    : "";

  return `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — klati.me</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;background:#090909;color:#fff;font-family:"Space Grotesk",Arial,sans-serif}
.nav{height:74px;border-bottom:1px solid #292929;display:flex;align-items:center;justify-content:space-between;padding:0 5%;position:sticky;top:0;background:#090909ee;backdrop-filter:blur(12px);z-index:5}
.logo{font:34px "Permanent Marker";color:#fff;text-decoration:none;text-shadow:3px 3px #ff3567,-2px -2px #27d9ff}
.nav a{color:#fff;text-decoration:none;margin-left:24px;font-weight:700}
.wrap{max-width:1000px;margin:auto;padding:80px 24px 120px}
.k{color:#d9ff00;letter-spacing:.2em;font-size:12px;font-weight:700}
h1{font-size:clamp(48px,8vw,100px);line-height:.95;margin:18px 0 25px;max-width:950px}
.meta{color:#999;font-size:14px;margin-bottom:40px}
.excerpt{font-size:24px;line-height:1.45;color:#ddd;max-width:820px;border-left:4px solid #d9ff00;padding-left:20px;margin:0 0 45px}
.cover{display:block;width:100%;max-height:620px;object-fit:cover;margin:0 0 45px;border:1px solid #292929}
.body{max-width:820px;font-size:20px;line-height:1.75;color:#eee}
.body p{margin:0 0 28px}
.share-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:55px}.share-btn{appearance:none;border:1px solid #3a3a3a;background:#151515;color:#fff;padding:14px 22px;font:700 14px "Space Grotesk",Arial,sans-serif;cursor:pointer;transition:.2s}.share-btn:hover{background:#d9ff00;color:#000;border-color:#d9ff00;transform:translateY(-1px)}.back{display:inline-block;padding:14px 22px;background:#d9ff00;color:#000;text-decoration:none;font-weight:700}.share-note{color:#888;font-size:13px}.modal{position:fixed;inset:0;background:#000b;display:none;align-items:center;justify-content:center;padding:20px;z-index:20}.modal.open{display:flex}.modal-box{width:min(460px,100%);background:#111;border:1px solid #333;padding:28px;box-shadow:0 20px 80px #000}.modal-title{font-size:24px;font-weight:700;margin-bottom:8px}.modal-sub{color:#999;font-size:14px;margin-bottom:22px}.share-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}.share-option{display:block;padding:14px;background:#1b1b1b;border:1px solid #303030;color:#fff;text-decoration:none;font-weight:700;text-align:center;cursor:pointer}.share-option:hover{background:#d9ff00;color:#000;border-color:#d9ff00}.close-modal{margin-top:16px;width:100%;padding:12px;background:transparent;border:1px solid #333;color:#aaa;cursor:pointer}.close-modal:hover{color:#fff;border-color:#666}
</style>
</head>
<body>
<header class="nav">
  <a class="logo" href="/">klati.me</a>
  <div>
    <a href="/#posts">ПИСАНИЦИ</a>
    <a href="/admin">ADMIN</a>
  </div>
</header>
<main class="wrap">
  <div class="k">${category}</div>
  <h1>${title}</h1>
  <div class="meta">${post.published_at ? new Date(post.published_at).toLocaleDateString("bg-BG") : ""}</div>
  ${excerpt ? `<div class="excerpt">${excerpt}</div>` : ""}
  ${cover}
  <article class="body">${body}</article>
  <div class="share-row">
    <button class="share-btn" id="shareBtn" type="button">↗ СПОДЕЛИ</button>
    <a class="back" href="/#posts">← НАЗАД КЪМ ПИСАНИЦИТЕ</a>
  </div>
  <div class="share-note">Хареса ти? Прати я на някого.</div>
</main>
<div class="modal" id="shareModal" aria-hidden="true">
  <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="shareTitle">
    <div class="modal-title" id="shareTitle">Сподели тази писаница</div>
    <div class="modal-sub">Избери къде да я изпратиш.</div>
    <div class="share-options">
      <a class="share-option" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://klati.me/p/' + post.slug)}">Facebook</a>
      <a class="share-option" target="_blank" rel="noopener" href="https://www.facebook.com/dialog/send?link=${encodeURIComponent('https://klati.me/p/' + post.slug)}">Messenger</a>
      <a class="share-option" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(title + ' — https://klati.me/p/' + post.slug)}">WhatsApp</a>
      <a class="share-option" target="_blank" rel="noopener" href="viber://forward?text=${encodeURIComponent(title + ' — https://klati.me/p/' + post.slug)}">Viber</a>
      <button class="share-option" id="copyLink" type="button">🔗 Копирай линка</button>
      <button class="share-option" id="nativeShare" type="button">📱 Сподели от телефона</button>
    </div>
    <button class="close-modal" id="closeShare" type="button">ЗАТВОРИ</button>
  </div>
</div>
<script>
(() => {
  const shareUrl = 'https://klati.me/p/' + ${JSON.stringify(post.slug)};
  const shareTitle = ${JSON.stringify(post.title)};
  const modal = document.getElementById('shareModal');
  const openBtn = document.getElementById('shareBtn');
  const closeBtn = document.getElementById('closeShare');
  const copyBtn = document.getElementById('copyLink');
  const nativeBtn = document.getElementById('nativeShare');

  openBtn.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({title: shareTitle, text: shareTitle, url: shareUrl});
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeBtn.click();
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copyBtn.textContent = '✓ Линкът е копиран';
      setTimeout(() => copyBtn.textContent = '🔗 Копирай линка', 1800);
    } catch {
      window.prompt('Копирай линка:', shareUrl);
    }
  });

  nativeBtn.addEventListener('click', async () => {
    if (!navigator.share) {
      nativeBtn.textContent = 'Не е налично на това устройство';
      setTimeout(() => nativeBtn.textContent = '📱 Сподели от телефона', 1800);
      return;
    }
    try { await navigator.share({title: shareTitle, text: shareTitle, url: shareUrl}); } catch (e) {}
  });
})();
</script>
</body>
</html>`;
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

      // Public article page: /p/<slug>
      if (path.startsWith("/p/") && request.method === "GET") {
        const slug = decodeURIComponent(path.slice("/p/".length));
        const post = await env.DB.prepare(
          `SELECT id, slug, title, excerpt, body, cover_url, category, published_at
           FROM posts WHERE slug=?1 AND status='published' LIMIT 1`
        ).bind(slug).first();

        if (!post) {
          return html(`<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Няма такава писаница — klati.me</title><style>body{margin:0;background:#090909;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}a{display:inline-block;margin-top:20px;padding:14px 20px;background:#d9ff00;color:#000;text-decoration:none;font-weight:700}</style></head><body><div><h1>Тази писаница се е изпарила.</h1><a href="/#posts">← КЪМ ПИСАНИЦИТЕ</a></div></body></html>`, 404);
        }

        return html(renderPostPage(post));
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
