/* SELEMANI : service worker (fonctionnement hors ligne)
   - Les pages et la bibliothèque Supabase sont gardées en mémoire à la première visite.
   - Les pages sont rechargées depuis Internet quand c'est possible, sinon la copie enregistrée s'affiche.
   - Les données (Supabase) ne sont jamais enregistrées par ce fichier : elles demandent Internet. */

const VERSION = "selemani-v3";
const MEDIA = "selemani-media-v1";   // images publiques de Supabase déjà vues
const MEDIA_MAX = 60;
const PAGES = [
  "./", "index.html", "connexion.html", "inscription.html", "accueil.html",
  "messages.html", "notifications.html", "profil.html", "creer.html",
  "offline.html", "manifest.json", "pwa.js", "cachelocal.js",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"
];
const BIBLIOTHEQUE = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
const DELAI_RESEAU = 4000; // au-delà, on affiche la copie enregistrée

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Un fichier absent (ex. creer.html) ne doit pas bloquer l'installation.
    await Promise.all(PAGES.map(async url => {
      try { await cache.add(new Request(url, { cache: "reload" })); } catch (e) { /* ignoré */ }
    }));
    try { await cache.add(new Request(BIBLIOTHEQUE, { mode: "cors", cache: "reload" })); } catch (e) { /* ignoré */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter(n => n !== VERSION && n !== MEDIA).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

function avecDelai(promesse, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("délai dépassé")), ms);
    promesse.then(r => { clearTimeout(t); resolve(r); }, e => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Images publiques de Supabase (photos de profil et de publications) : gardées pour le hors ligne.
  if (url.hostname.endsWith("supabase.co") && url.pathname.includes("/storage/v1/object/public/") && req.destination === "image") {
    event.respondWith((async () => {
      const cache = await caches.open(MEDIA);
      const copie = await cache.match(req.url);
      if (copie) return copie;
      try {
        const reponse = await fetch(req.url, { mode: "cors" });
        if (reponse && reponse.ok) {
          await cache.put(req.url, reponse.clone());
          const cles = await cache.keys();
          for (let i = 0; i < cles.length - MEDIA_MAX; i++) await cache.delete(cles[i]);
        }
        return reponse;
      } catch (e) {
        return new Response("", { status: 504 });
      }
    })());
    return;
  }

  // Les données de Supabase (publications, messages, notifications) passent toujours par Internet.
  if (url.hostname.endsWith("supabase.co")) return;

  // Pages : Internet d'abord, copie enregistrée si hors ligne ou trop lent.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const reponse = await avecDelai(fetch(req), DELAI_RESEAU);
        if (reponse && reponse.ok && url.origin === self.location.origin) {
          cache.put(req, reponse.clone());
        }
        return reponse;
      } catch (e) {
        const copie = (await cache.match(req, { ignoreSearch: true })) ||
                      (await cache.match("offline.html"));
        return copie || new Response("Hors ligne", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  // Fichiers du site et bibliothèque Supabase : copie enregistrée d'abord, mise à jour en arrière-plan.
  if (url.origin === self.location.origin || req.url === BIBLIOTHEQUE) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const copie = await cache.match(req, { ignoreSearch: true });
      const miseAJour = fetch(req).then(reponse => {
        if (reponse && reponse.ok) cache.put(req, reponse.clone());
        return reponse;
      }).catch(() => null);
      return copie || (await miseAJour) || new Response("", { status: 504 });
    })());
  }
});
