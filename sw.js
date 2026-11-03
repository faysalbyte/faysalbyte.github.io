"use strict";

var VERSION = "sx-v5";
var SHELL = ["./", "index.html", "contact.html", "portfolio.html", "skills.html", "404.html", "style.css", "home.css", "enhance.css", "skeleton.css", "common.js", "enhance.js", "skeleton.js", "cert-toggle.css", "cert-toggle.js", "viewport-sync.js", "site.webmanifest", "icons/md-faysal-hossain-web-app-icon-192.png"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") !== -1) return;
  if (request.headers.has("range") || request.destination === "video" || request.destination === "audio") return;  /* media streams straight from the network */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(VERSION).then(function (cache) { return cache.put(request, copy); }).catch(function () {});
        return response;
      }).catch(function () {
        return caches.match(request).then(function (hit) {
          return hit || caches.match("index.html");
        }).then(function (hit) {
          return hit || caches.match("./");
        }).then(function (hit) {
          return hit || Response.error();
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (hit) {
      var network = fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === "basic") {
          var copy = response.clone();
          caches.open(VERSION).then(function (cache) { return cache.put(request, copy); }).catch(function () {});
        }
        return response;
      }).catch(function () { return hit || Response.error(); });
      return hit || network;
    })
  );
});
