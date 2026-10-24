/* SELEMANI : sauvegarde locale des derniers contenus, propre à chaque compte.
   - Sert à afficher le dernier fil, les dernières conversations et notifications hors ligne.
   - Les copies sont effacées à la déconnexion, et celles d'un autre compte sont supprimées. */
(function () {
  "use strict";
  var PREFIX = "selemani_cache_";
  var CLE_SESSION = "sb-cgihcctpedkaessouozs-auth-token"; // session Supabase enregistrée par la bibliothèque
  var uid = null;

  function cle(k) { return PREFIX + uid + "_" + k; }
  function supprimer(filtre) {
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var n = localStorage.key(i);
        if (n && n.indexOf(PREFIX) === 0 && filtre(n)) localStorage.removeItem(n);
      }
    } catch (e) { /* stockage indisponible */ }
  }

  window.CacheSelemani = {
    // À appeler dès que l'identifiant de la personne connectée est connu.
    init: function (id) {
      uid = id;
      supprimer(function (n) { return n.indexOf(PREFIX + id + "_") !== 0; });
    },
    set: function (k, v) {
      if (!uid) return;
      var texte;
      try { texte = JSON.stringify({ t: Date.now(), d: v }); } catch (e) { return; }
      try { localStorage.setItem(cle(k), texte); }
      catch (e) {
        // Stockage plein : on libère les anciennes conversations puis on réessaie une fois.
        supprimer(function (n) { return n.indexOf(PREFIX + uid + "_chat_") === 0; });
        try { localStorage.setItem(cle(k), texte); } catch (e2) { /* abandon */ }
      }
    },
    get: function (k) {
      if (!uid) return null;
      try { var r = localStorage.getItem(cle(k)); return r ? JSON.parse(r) : null; } catch (e) { return null; }
    },
    viderTout: function () { supprimer(function () { return true; }); },
    // Utilisateur enregistré par Supabase : sert uniquement à afficher le contenu enregistré hors ligne.
    utilisateurLocal: function () {
      try {
        var r = JSON.parse(localStorage.getItem(CLE_SESSION) || "null");
        var u = r && (r.user || (r.currentSession && r.currentSession.user));
        return u && u.id ? u : null;
      } catch (e) { return null; }
    },
    horsLigne: function (erreur) {
      return !navigator.onLine || (erreur && /failed to fetch|network|load failed|fetch/i.test(String(erreur.message || erreur)));
    },
    dateTexte: function (t) {
      try { return new Date(t).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
    }
  };
})();
