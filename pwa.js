/* SELEMANI : installation de l'application et mode hors ligne */
(function () {
  "use strict";

  // 1) Service worker (hors ligne)
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function (e) {
        console.warn("Service worker non enregistré :", e);
      });
    });
  }

  // 2) Bandeau « hors ligne » sur toutes les pages
  var bandeau = null;
  function creerBandeau() {
    if (bandeau) return bandeau;
    bandeau = document.createElement("div");
    bandeau.setAttribute("role", "status");
    bandeau.setAttribute("aria-live", "polite");
    bandeau.style.cssText =
      "position:fixed;left:0;right:0;top:0;z-index:2147483000;padding:calc(7px + env(safe-area-inset-top)) 12px 7px;" +
      "text-align:center;font:600 12.5px system-ui,sans-serif;color:#fff;" +
      "background:linear-gradient(90deg,#8b5cf6,#ff2e93);box-shadow:0 4px 18px rgba(0,0,0,.4);display:none";
    document.body.appendChild(bandeau);
    return bandeau;
  }
  var masquage = null;
  function majReseau() {
    var b = creerBandeau();
    clearTimeout(masquage);
    if (navigator.onLine) {
      if (b.style.display === "block") {
        b.textContent = "Connexion rétablie ✓";
        masquage = setTimeout(function () { b.style.display = "none"; }, 2000);
      }
    } else {
      b.textContent = "Mode hors ligne : certaines fonctions demandent Internet.";
      b.style.display = "block";
    }
  }
  document.addEventListener("DOMContentLoaded", function () { if (!navigator.onLine) majReseau(); });
  window.addEventListener("offline", majReseau);
  window.addEventListener("online", majReseau);

  // 3) Bouton « Installer l'application » (page d'accueil publique)
  var evenementInstall = null;
  var enModeApp = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  var estIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    evenementInstall = e;
    afficherBouton();
  });
  window.addEventListener("appinstalled", function () {
    evenementInstall = null;
    var b = document.getElementById("btnInstaller");
    if (b) b.style.display = "none";
  });

  function afficherBouton() {
    var b = document.getElementById("btnInstaller");
    if (b && !enModeApp) b.style.display = "flex";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("btnInstaller");
    if (!b || enModeApp) return;
    if (estIOS) b.style.display = "flex"; // pas d'invite automatique sur iPhone
    b.addEventListener("click", async function () {
      if (evenementInstall) {
        evenementInstall.prompt();
        try { await evenementInstall.userChoice; } catch (e) { /* ignoré */ }
        evenementInstall = null;
        b.style.display = "none";
      } else if (estIOS) {
        alert("Sur iPhone : touche le bouton Partager de Safari, puis « Sur l'écran d'accueil ».");
      } else {
        alert("Ouvre le menu ⋮ de Chrome, puis touche « Installer l'application » ou « Ajouter à l'écran d'accueil ».");
      }
    });
  });
})();
