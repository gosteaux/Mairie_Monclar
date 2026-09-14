/* Moteur d'itinéraire – graphe routier simplifié autour de Monclar-sur-l'Osse.
   Fonctionne dans le navigateur (window.MonclarRouter) et sous Node (module.exports) pour les tests. */
(function (root) {
  'use strict';

  var R_TERRE = 6371; // km
  // vitesses moyennes indicatives (km/h) et coefficient de sinuosité par type de voie
  var VITESSE = { rd: 65, communal: 35, traverse: 30, chantier: 30 };
  var SINUOSITE = { rd: 1.2, communal: 1.3, traverse: 1.2, chantier: 1.0 };

  function toRad(d) { return d * Math.PI / 180; }

  /* Distance orthodromique en km entre deux points [lat, lon] */
  function haversine(a, b) {
    var dLat = toRad(b[0] - a[0]);
    var dLon = toRad(b[1] - a[1]);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R_TERRE * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  /* Points successifs d'une arête parcourue de a vers b (avec points de passage) */
  function pointsArete(network, e, fromId) {
    var a = network.nodes[e.a], b = network.nodes[e.b];
    var pts = [[a.lat, a.lon]].concat(e.via || []).concat([[b.lat, b.lon]]);
    if (fromId === e.b) pts.reverse();
    return pts;
  }

  function longueurArete(network, e) {
    var pts = pointsArete(network, e, e.a), km = 0;
    for (var i = 1; i < pts.length; i++) km += haversine(pts[i - 1], pts[i]);
    return km * (SINUOSITE[e.kind] || 1.2);
  }

  /* Prépare le graphe : longueur et durée de chaque arête, liste d'adjacence */
  function preparer(network) {
    var adj = {};
    Object.keys(network.nodes).forEach(function (id) { adj[id] = []; });
    network.edges.forEach(function (e, idx) {
      e.id = idx;
      e.km = longueurArete(network, e);
      e.min = e.km / (VITESSE[e.kind] || 60) * 60;
      adj[e.a].push(e);
      adj[e.b].push(e);
    });
    network.adj = adj;
    return network;
  }

  /* Trouve la période et l'état de la traversée pour une date AAAA-MM-JJ */
  function etatPourDate(data, dateStr) {
    var p = data.periodes;
    if (dateStr < p[0].debut) return { etat: 'normal', periode: null, hors: 'avant', info: data.avantChantier };
    for (var i = 0; i < p.length; i++) {
      if (dateStr >= p[i].debut && dateStr <= p[i].fin) return { etat: p[i].etat, periode: p[i], hors: null, info: p[i] };
    }
    if (dateStr > p[p.length - 1].fin) return { etat: 'normal', periode: null, hors: 'apres', info: data.apresChantier };
    // date entre deux périodes (week-end non couvert) : on reprend l'état de la période précédente
    var prev = null;
    for (var j = 0; j < p.length; j++) if (p[j].fin < dateStr) prev = p[j];
    return { etat: prev ? prev.etat : 'normal', periode: prev, hors: null, info: prev };
  }

  /* Une arête est-elle autorisée ? Retourne {ok, penalite, flags[]} */
  function verifierArete(e, ctx) {
    var flags = [], penalite = 1;
    if (e.maxWeight && ctx.vehicule && !ctx.vehicule.agri && ctx.vehicule.maxWeight > e.maxWeight) {
      return { ok: false, raison: 'tonnage' };
    }
    if (e.kind === 'chantier' && ctx.fermes.indexOf(e.axis) !== -1) {
      if (ctx.relaxChantier) { flags.push('riverain'); penalite = 6; }
      else return { ok: false, raison: 'ferme' };
    }
    if (e.kind === 'traverse') {
      flags.push('traverse');
      // hors fermeture, la voie communale (étroite, sens unique en temps normal) n'est pas un raccourci à conseiller
      if (!ctx.fermes.length) penalite *= 3;
    }
    if (ctx.vehicule && ctx.vehicule.maxWeight > 9 && !ctx.vehicule.agri) {
      // poids lourds : préférence aux corridors de déviation officiels, réticence sur les liaisons non qualifiées
      if (e.corridor) penalite *= 0.8;
      else if (e.kind === 'rd' && e.road === 'RD') penalite *= 1.6;
    }
    if (e.corridor) flags.push(e.corridor);
    return { ok: true, penalite: penalite, flags: flags };
  }

  /* Plus court chemin (Dijkstra) en durée pondérée */
  function calculer(network, data, opts) {
    if (!network.adj) preparer(network);
    var from = opts.from, to = opts.to;
    if (!network.nodes[from] || !network.nodes[to]) return { ok: false, raison: 'noeud-inconnu' };
    if (from === to) return { ok: false, raison: 'identique' };
    var etatDef = data.etats[opts.etat] || data.etats.normal;
    var ctx = {
      fermes: etatDef.closed || [],
      vehicule: opts.vehicule || null,
      relaxChantier: !!opts.relaxChantier
    };
    var dist = {}, prev = {}, prevEdge = {}, done = {};
    Object.keys(network.nodes).forEach(function (id) { dist[id] = Infinity; });
    dist[from] = 0;
    for (;;) {
      var u = null, best = Infinity;
      for (var id in dist) if (!done[id] && dist[id] < best) { best = dist[id]; u = id; }
      if (u === null || u === to) break;
      done[u] = true;
      network.adj[u].forEach(function (e) {
        var v = e.a === u ? e.b : e.a;
        if (done[v]) return;
        var chk = verifierArete(e, ctx);
        if (!chk.ok) return;
        var nd = dist[u] + e.min * chk.penalite;
        if (nd < dist[v]) { dist[v] = nd; prev[v] = u; prevEdge[v] = e; }
      });
    }
    if (dist[to] === Infinity) return { ok: false, raison: 'aucun', etat: opts.etat };
    var path = [to], edges = [];
    while (path[0] !== from) { edges.unshift(prevEdge[path[0]]); path.unshift(prev[path[0]]); }
    var km = 0, min = 0, flags = {};
    edges.forEach(function (e, i) {
      km += e.km; min += e.min;
      verifierArete(e, ctx).flags.forEach(function (f) { flags[f] = true; });
    });
    // géométrie schématique : liste de points [lat, lon]
    var geom = [];
    edges.forEach(function (e, i) {
      var pts = pointsArete(network, e, path[i]);
      if (i > 0) pts = pts.slice(1);
      geom = geom.concat(pts);
    });
    return { ok: true, from: from, to: to, path: path, edges: edges, km: km, min: min, flags: flags, geom: geom, etat: opts.etat };
  }

  /* Regroupe les arêtes consécutives par route pour l'affichage des étapes */
  function etapes(network, res) {
    var out = [];
    res.edges.forEach(function (e, i) {
      var from = res.path[i], to = res.path[i + 1];
      var last = out[out.length - 1];
      if (last && last.road === e.road && last.kind === e.kind) {
        last.to = to; last.km += e.km; last.min += e.min; last.parcours.push(to);
      } else {
        out.push({ road: e.road, kind: e.kind, from: from, to: to, km: e.km, min: e.min, maxWeight: e.maxWeight || null, parcours: [from, to] });
      }
    });
    return out;
  }

  /* Nœud (village) le plus proche d'une position */
  function villagePlusProche(network, lat, lon) {
    var best = null, bestKm = Infinity;
    Object.keys(network.nodes).forEach(function (id) {
      var n = network.nodes[id];
      if (n.type !== 'village') return;
      var d = haversine([lat, lon], [n.lat, n.lon]);
      if (d < bestKm) { bestKm = d; best = id; }
    });
    return { id: best, km: bestKm };
  }

  /* Suite de coordonnées à envoyer au service d'itinéraire (avec points de passage) */
  function pointsPassage(network, res) {
    var pts = [];
    res.edges.forEach(function (e, i) {
      var p = pointsArete(network, e, res.path[i]);
      if (i > 0) p = p.slice(1);
      pts = pts.concat(p);
    });
    return pts;
  }

  var api = { haversine: haversine, preparer: preparer, etatPourDate: etatPourDate, calculer: calculer, etapes: etapes,
    villagePlusProche: villagePlusProche, pointsPassage: pointsPassage, verifierArete: verifierArete };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MonclarRouter = api;
})(typeof window !== 'undefined' ? window : globalThis);
