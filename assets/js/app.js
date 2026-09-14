/* Interface du site : formulaire d'itinéraire, carte Leaflet, calendrier. */
(function () {
  'use strict';
  var DATA = window.MONCLAR_DATA, NET = window.MONCLAR_NETWORK, RT = window.MonclarRouter;
  RT.preparer(NET);

  var $ = function (s) { return document.querySelector(s); };
  var map, coucheRoute, coucheSchema, coucheMarqueurs, marqueurPos, marqueurChantier, coucheTraverse, coucheFermetures;
  var positionUtilisateur = null; // {lat, lon, villageId, km}
  var requeteEnCours = null;

  /* ---------- utilitaires ---------- */
  function aujourdhui() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDate(iso, opts) {
    var p = iso.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return d.toLocaleDateString('fr-FR', opts || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function fmtCourt(iso) { return fmtDate(iso, { day: 'numeric', month: 'short' }); }
  function fmtKm(km) { return (km < 10 ? km.toFixed(1) : Math.round(km)).toString().replace('.', ',') + ' km'; }
  function fmtMin(min) { var m = Math.round(min); return m >= 60 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') : m + ' min'; }
  function nomNoeud(id) { return NET.nodes[id] ? NET.nodes[id].name : id; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function vehiculeChoisi() {
    var id = (document.querySelector('input[name=vehicule]:checked') || {}).value || 'vl';
    return DATA.vehicules.filter(function (v) { return v.id === id; })[0];
  }
  function isoWeek(iso) {
    var p = iso.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    var day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - y0) / 86400000 + 1) / 7);
  }

  /* ---------- bandeau du jour ---------- */
  function afficherEtatJour() {
    var iso = aujourdhui(), r = RT.etatPourDate(DATA, iso), e = DATA.etats[r.etat];
    var carte = $('#etat-jour .carte');
    carte.style.borderLeftColor = e.couleur;
    $('#etat-jour .pastille').textContent = e.court;
    $('#etat-jour .pastille').style.background = e.couleur;
    $('#etat-jour .detail').innerHTML = '<strong>' + esc(fmtDate(iso)) + ' – ' + esc(e.label) + '</strong>' +
      '<span>' + esc(r.info.titre) + (r.info.semaine ? ' (' + esc(r.info.semaine) + ')' : '') + '. ' +
      (r.hors ? esc(r.info.detail) : 'Les dates sont prévisionnelles : la signalisation en place prévaut.') + '</span>';
  }

  /* ---------- formulaire ---------- */
  function remplirSelects() {
    var villages = Object.keys(NET.nodes).filter(function (id) { return NET.nodes[id].type === 'village'; })
      .sort(function (a, b) { return NET.nodes[a].name.localeCompare(NET.nodes[b].name, 'fr'); });
    var cibles = ['#depart', '#arrivee'];
    var favoris = ['bars', 'pouylebon', 'saint_christaud', 'monclar', 'mirande', 'marciac', 'montesquiou', 'tillac'];
    cibles.forEach(function (sel) {
      var s = $(sel);
      var g1 = document.createElement('optgroup'); g1.label = 'Villages voisins';
      var g2 = document.createElement('optgroup'); g2.label = 'Autres communes';
      villages.forEach(function (id) {
        var o = document.createElement('option'); o.value = id; o.textContent = NET.nodes[id].name;
        (favoris.indexOf(id) !== -1 ? g1 : g2).appendChild(o);
      });
      s.appendChild(g1); s.appendChild(g2);
    });
    $('#depart').value = 'bars';
    $('#arrivee').value = 'mirande';
    var vd = $('#vehicules');
    DATA.vehicules.forEach(function (v, i) {
      var l = document.createElement('label');
      l.innerHTML = '<input type="radio" name="vehicule" value="' + v.id + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<span class="ic" aria-hidden="true">' + v.icon + '</span><span class="lab">' + esc(v.label) + '<small>' + esc(v.detail) + '</small></span>';
      vd.appendChild(l);
    });
    var d = $('#date'); d.value = aujourdhui(); d.min = '2026-08-01'; d.max = '2027-06-30';
  }

  /* ---------- carte ---------- */
  function iconeChantier(etat) {
    var cls = etat === 'normal' ? 'ouvert' : (etat === 'total' || etat === 'zones' ? '' : 'partiel');
    return L.divIcon({ className: '', html: '<div class="marqueur-chantier ' + cls + '" title="Carrefour RD 34 / RD 159">🚧</div>', iconSize: [34, 34], iconAnchor: [17, 17] });
  }
  function initCarte() {
    map = L.map('map', { scrollWheelZoom: false }).setView([43.5318, 0.3320], 12);
    // fond de secours : limites des communes, dessinées sous les tuiles (visibles si les tuiles ne se chargent pas)
    if (window.MONCLAR_COMMUNES) {
      map.createPane('fond'); map.getPane('fond').style.zIndex = 150;
      var fondRenderer = L.svg({ pane: 'fond' });
      L.geoJSON(window.MONCLAR_COMMUNES, { renderer: fondRenderer, interactive: false,
        style: function () { return { color: '#8aa392', weight: 1.2, fillColor: '#e6efe0', fillOpacity: 1 }; } }).addTo(map);
    }
    var tuiles = L.tileLayer(DATA.tuiles.url, { attribution: DATA.tuiles.attribution, maxZoom: 19 }).addTo(map);
    var erreursTuiles = 0;
    tuiles.on('tileerror', function () {
      if (++erreursTuiles === 4) map.attributionControl.setPrefix('Fond détaillé indisponible : limites des communes affichées · <a href="https://leafletjs.com">Leaflet</a>');
    });
    map.on('click focus', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });

    coucheMarqueurs = L.layerGroup().addTo(map);
    Object.keys(NET.nodes).forEach(function (id) {
      var n = NET.nodes[id];
      if (n.type !== 'village' || id === 'monclar') return;
      L.circleMarker([n.lat, n.lon], { radius: 5, color: '#1e4b3d', weight: 2, fillColor: '#fff', fillOpacity: 1 })
        .bindTooltip(n.name, { permanent: true, direction: 'right', className: 'village-label', offset: [6, 0] })
        .on('click', function () { $('#arrivee').value = id; })
        .addTo(coucheMarqueurs);
    });
    // voie communale limitée à 9 t
    var tr = NET.edges.filter(function (e) { return e.kind === 'traverse'; })[0];
    var pts = RT.pointsPassage(NET, { edges: [tr], path: [tr.a, tr.b] });
    coucheTraverse = L.polyline(pts, { color: '#ef6c00', weight: 5, dashArray: '8 6', opacity: .9 })
      .bindPopup('<b>Voie communale de traverse</b><br>Limitée à <b>' + DATA.traverse.limiteTonnes + ' t</b> (sauf véhicules agricoles).<br><small>' + esc(DATA.traverse.description) + ' ' + esc(DATA.traverse.sens) + '</small>')
      .addTo(map);
    coucheFermetures = L.layerGroup().addTo(map);
    marqueurChantier = L.marker([NET.nodes.monclar.lat, NET.nodes.monclar.lon], { icon: iconeChantier('normal'), zIndexOffset: 500 })
      .bindPopup('<b>Carrefour RD 34 / RD 159</b><br>Zone de travaux – sécurisation de la traversée').addTo(map);
    coucheSchema = L.layerGroup().addTo(map);
    coucheRoute = L.layerGroup().addTo(map);
    afficherFermetures(RT.etatPourDate(DATA, aujourdhui()).etat);
  }
  function afficherFermetures(etat) {
    coucheFermetures.clearLayers();
    marqueurChantier.setIcon(iconeChantier(etat));
    var fermes = DATA.etats[etat].closed;
    NET.edges.filter(function (e) { return e.kind === 'chantier' && fermes.indexOf(e.axis) !== -1; }).forEach(function (e) {
      var pts = RT.pointsPassage(NET, { edges: [e], path: [e.a, e.b] });
      L.polyline(pts, { color: '#c62828', weight: 7, opacity: .85 }).bindPopup('<b>' + esc(e.road) + ' barrée</b><br>' + esc(DATA.etats[etat].label)).addTo(coucheFermetures);
      var ext = NET.nodes[e.a === 'monclar' ? e.b : e.a];
      L.marker([ext.lat, ext.lon], { icon: L.divIcon({ className: '', html: '<div style="background:#fff;border:3px solid #c62828;border-radius:50%;width:18px;height:18px;display:grid;place-items:center;font-size:11px;font-weight:900;color:#c62828">✕</div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(coucheFermetures);
    });
  }

  /* ---------- géolocalisation ---------- */
  function geolocaliser() {
    var info = $('#geo-info');
    if (!navigator.geolocation) { info.textContent = 'Géolocalisation non disponible sur cet appareil.'; return; }
    info.textContent = 'Recherche de votre position…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lon = pos.coords.longitude;
      var v = RT.villagePlusProche(NET, lat, lon);
      if (v.km > 40) { info.textContent = 'Vous êtes à plus de 40 km de Monclar : choisissez un village de départ dans la liste.'; positionUtilisateur = null; return; }
      positionUtilisateur = { lat: lat, lon: lon, villageId: v.id, km: v.km };
      $('#depart').value = v.id;
      info.textContent = 'Position détectée : vous êtes près de ' + nomNoeud(v.id) + ' (à ' + fmtKm(v.km) + '). L\'itinéraire partira de votre position.';
      if (marqueurPos) map.removeLayer(marqueurPos);
      marqueurPos = L.marker([lat, lon], { icon: L.divIcon({ className: '', html: '<div class="marqueur-pos"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) })
        .bindTooltip('Votre position').addTo(map);
      map.setView([lat, lon], 13);
    }, function (err) {
      positionUtilisateur = null;
      info.textContent = err.code === 1 ? 'Accès à la position refusé : choisissez votre village de départ dans la liste.' : 'Position introuvable : choisissez votre village de départ dans la liste.';
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  $('#depart').addEventListener('change', function () {
    if (positionUtilisateur && positionUtilisateur.villageId !== this.value) { positionUtilisateur = null; $('#geo-info').textContent = ''; if (marqueurPos) { map.removeLayer(marqueurPos); marqueurPos = null; } }
  });

  /* ---------- calcul et affichage ---------- */
  function alerte(type, ic, html) { return '<div class="alerte ' + type + '"><span class="ic" aria-hidden="true">' + ic + '</span><div>' + html + '</div></div>'; }

  function calculerItineraire() {
    var from = $('#depart').value, to = $('#arrivee').value, iso = $('#date').value || aujourdhui();
    var veh = vehiculeChoisi();
    var r = RT.etatPourDate(DATA, iso), etatDef = DATA.etats[r.etat];
    var zone = $('#resultat');
    afficherFermetures(r.etat);
    coucheRoute.clearLayers(); coucheSchema.clearLayers();
    if (requeteEnCours) { requeteEnCours.abort(); requeteEnCours = null; }

    if (from === to) { zone.innerHTML = alerte('attention', '⚠️', 'Choisissez une destination différente du point de départ.'); return; }

    var relax = (from === 'monclar' || to === 'monclar');
    var res = RT.calculer(NET, DATA, { from: from, to: to, etat: r.etat, vehicule: veh, relaxChantier: relax });
    var resNormal = RT.calculer(NET, DATA, { from: from, to: to, etat: 'normal', vehicule: veh, relaxChantier: true });

    var html = '<div class="carte etat" style="border-left-color:' + etatDef.couleur + '">' +
      '<h3>' + esc(fmtDate(iso)) + ' <span class="badge" style="background:' + etatDef.couleur + '">' + esc(etatDef.court) + '</span></h3>' +
      '<p><b>' + esc(r.info.titre) + '</b>' + (r.info.semaine ? ' <span class="note">(' + esc(r.info.semaine) + ')</span>' : '') + '<br><span class="note">' + esc(r.info.detail) + '</span></p>';

    if (!res.ok) {
      html += alerte('danger', '⛔', 'Aucun itinéraire trouvé pour ce type de véhicule à cette date entre <b>' + esc(nomNoeud(from)) + '</b> et <b>' + esc(nomNoeud(to)) + '</b>. Suivez la déviation mise en place sur le terrain ou contactez la mairie.') + '</div>';
      zone.innerHTML = html; return;
    }

    var etapes = RT.etapes(NET, res);
    var passeChantier = res.edges.some(function (e) { return e.kind === 'chantier'; });
    html += '<div class="kpi"><div><b>' + fmtKm(res.km) + '</b><span id="kpi-km-note">distance estimée</span></div><div><b>' + fmtMin(res.min) + '</b><span id="kpi-min-note">durée estimée</span></div>';
    if (resNormal.ok && res.km - resNormal.km > 0.5) html += '<div><b>+' + fmtKm(res.km - resNormal.km) + '</b><span>détour dû aux travaux</span></div>';
    html += '</div>';

    if (r.etat !== 'normal' && !passeChantier) html += alerte('attention', '🚧', 'Carrefour de Monclar : <b>' + esc(etatDef.label) + '</b>. Cet itinéraire contourne la zone de travaux.');
    if (r.etat !== 'normal' && passeChantier && !res.flags.riverain) html += alerte('ok', '✅', 'Votre trajet traverse Monclar par la RD restée ouverte. Roulez au pas dans la zone de chantier et respectez la signalisation.');
    if (res.flags.riverain) html += alerte('danger', '🏠', 'Votre départ ou votre arrivée se situe dans la zone de travaux : l\'accès des riverains est maintenu selon l\'avancement du chantier, rapprochez-vous du chef de chantier ou de la mairie.');
    if (res.flags.traverse) html += alerte('attention', '⚖️', 'Vous empruntez la <b>voie communale de traverse limitée à ' + DATA.traverse.limiteTonnes + ' t</b> (sauf véhicules agricoles) : voie étroite, roulez au pas et laissez le passage aux engins de chantier.');
    if (veh.id === 'pl') html += alerte('info', '🚛', 'Plus de 9 t : la voie communale de traverse vous est interdite ; l\'itinéraire suit les routes départementales des déviations officielles (D1 par Bassoues et la RD 943, D2 par Saint-Maur, Laas et Tillac).');
    if (veh.id === 'velo') html += alerte('info', '🚲', 'À vélo, le chantier reste infranchissable ; empruntez la voie communale ou les routes départementales indiquées.');
    if (r.etat === 'normal' && r.hors === null && r.periode && r.periode.debut >= '2026-11-07') html += alerte('info', 'ℹ️', 'Fin des travaux principaux : la réouverture complète du carrefour doit être confirmée par la mairie ; sur place, suivez la signalisation (30 km/h).');
    html += alerte('info', '🪧', 'Sur place, suivez la signalisation temporaire et les indications des équipes.');

    html += '<ol class="etapes">';
    html += '<li><span class="num dep">D</span><span class="route">' + esc(positionUtilisateur && from === positionUtilisateur.villageId ? 'Votre position (près de ' + nomNoeud(from) + ')' : nomNoeud(from)) + '<small>Départ</small></span><span></span></li>';
    etapes.forEach(function (et, i) {
      var via = et.parcours.slice(1, -1).map(nomNoeud).filter(function (n, idx, arr) { return NET.nodes[et.parcours[idx + 1]] && NET.nodes[et.parcours[idx + 1]].type === 'village'; });
      var sub = (NET.nodes[et.to] && NET.nodes[et.to].type === 'junction' ? 'vers ' : 'jusqu\'à ') + nomNoeud(et.to) + (via.length ? ' via ' + via.join(', ') : '');
      if (et.maxWeight) sub += ' – limité à ' + et.maxWeight + ' t';
      html += '<li><span class="num">' + (i + 1) + '</span><span class="route">' + esc(et.road) + '<small>' + esc(sub) + '</small></span><span class="km">' + fmtKm(et.km) + '</span></li>';
    });
    html += '<li><span class="num arr">A</span><span class="route">' + esc(nomNoeud(to)) + '<small>Arrivée</small></span><span></span></li></ol>';
    html += '<p class="note" id="note-geom">Tracé schématique. Chargement du tracé routier détaillé…</p></div>';
    zone.innerHTML = html;

    // tracé schématique immédiat
    var geom = res.geom.slice();
    if (positionUtilisateur && from === positionUtilisateur.villageId) geom.unshift([positionUtilisateur.lat, positionUtilisateur.lon]);
    var schema = L.polyline(geom, { color: '#1e4b3d', weight: 5, opacity: .8, dashArray: '10 8' }).addTo(coucheSchema);
    L.circleMarker(geom[0], { radius: 8, color: '#2e7d32', fillColor: '#2e7d32', fillOpacity: 1 }).bindTooltip('Départ').addTo(coucheSchema);
    L.circleMarker(geom[geom.length - 1], { radius: 8, color: '#c62828', fillColor: '#c62828', fillOpacity: 1 }).bindTooltip('Arrivée').addTo(coucheSchema);
    map.fitBounds(schema.getBounds().pad(0.15));

    chargerTraceRoutier(geom, res);
  }

  /* Tracé routier détaillé via le service OSRM (si joignable) */
  function chargerTraceRoutier(points, res) {
    var note = $('#note-geom');
    if (!DATA.osrmUrl || !window.fetch || !window.AbortController) { if (note) note.textContent = 'Tracé schématique (le service de calcul de tracé routier est désactivé).'; return; }
    // limite le nombre de points envoyés (les points intermédiaires des longues RD ne sont pas nécessaires)
    var pts = points.filter(function (p, i) { return i === 0 || i === points.length - 1 || RT.haversine(p, points[i - 1]) > 0.05; });
    var coords = pts.map(function (p) { return p[1].toFixed(5) + ',' + p[0].toFixed(5); }).join(';');
    var ctrl = new AbortController(); requeteEnCours = ctrl;
    var timer = setTimeout(function () { ctrl.abort(); }, 9000);
    fetch(DATA.osrmUrl + coords + '?overview=full&geometries=geojson&steps=false', { signal: ctrl.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        if (!j.routes || !j.routes[0]) throw new Error('pas de route');
        var route = j.routes[0];
        coucheSchema.eachLayer(function (l) { if (l instanceof L.Polyline && !(l instanceof L.CircleMarker)) coucheSchema.removeLayer(l); });
        var line = L.geoJSON(route.geometry, { style: { color: '#1e4b3d', weight: 6, opacity: .9 } }).addTo(coucheRoute);
        L.geoJSON(route.geometry, { style: { color: '#fff', weight: 10, opacity: .6 } }).addTo(coucheRoute).bringToBack();
        map.fitBounds(line.getBounds().pad(0.12));
        var km = route.distance / 1000, min = route.duration / 60;
        var kpiKm = $('#kpi-km-note'), kpiMin = $('#kpi-min-note');
        if (kpiKm) { kpiKm.previousElementSibling.textContent = fmtKm(km); kpiKm.textContent = 'distance par la route'; }
        if (kpiMin) { kpiMin.previousElementSibling.textContent = fmtMin(min); kpiMin.textContent = 'durée par la route'; }
        if (note) note.textContent = 'Tracé routier calculé sur le réseau OpenStreetMap (OSRM). Itinéraire indicatif : la signalisation en place prévaut.';
      })
      .catch(function () {
        clearTimeout(timer);
        if (note) note.textContent = 'Tracé schématique (service de tracé routier momentanément indisponible). L\'itinéraire et les distances restent indicatifs.';
      });
  }

  /* ---------- calendrier ---------- */
  function afficherCalendrier() {
    var iso = aujourdhui(), semNow = isoWeek(iso);
    var strip = $('#semaines'), html = '';
    for (var s = 35; s <= 49; s++) {
      // lundi de la semaine ISO s de 2026 : 2026-01-01 est un jeudi -> semaine 1 commence le lundi 29/12/2025
      var lundi = new Date(Date.UTC(2025, 11, 29 + (s - 1) * 7));
      var isoL = lundi.toISOString().slice(0, 10);
      var r = RT.etatPourDate(DATA, isoL), e = DATA.etats[r.etat];
      var lab = lundi.getUTCDate() + '/' + (lundi.getUTCMonth() + 1);
      html += '<div class="s' + (s === semNow && iso.slice(0, 4) === '2026' ? ' now' : '') + '" style="background:' + e.couleur + '" title="Semaine ' + s + ' – ' + esc(e.label) + '">S' + s + '<small>' + lab + '</small></div>';
    }
    strip.innerHTML = html;
    var ul = $('#periodes'), li = '';
    DATA.periodes.forEach(function (p) {
      var e = DATA.etats[p.etat], now = iso >= p.debut && iso <= p.fin;
      li += '<li class="' + (now ? 'now' : '') + '" style="border-left-color:' + e.couleur + '">' +
        '<div class="dates">' + esc(fmtCourt(p.debut)) + ' → ' + esc(fmtCourt(p.fin)) + '<small>' + esc(p.semaine) + (now ? ' · en cours' : '') + '</small></div>' +
        '<div><div class="titre">' + esc(p.titre) + ' <span class="badge" style="background:' + e.couleur + '">' + esc(e.court) + '</span></div><p class="detail">' + esc(p.detail) + '</p></div></li>';
    });
    ul.innerHTML = li;
  }

  /* ---------- contenus statiques ---------- */
  function afficherContenus() {
    $('#chiffres').innerHTML = DATA.chiffres.map(function (c) { return '<div class="c"><b>' + esc(c.valeur) + '</b><span>' + esc(c.legende) + '</span></div>'; }).join('');
    $('#travaux').innerHTML = DATA.travaux.map(function (t) { return '<div class="carte"><span class="ic" aria-hidden="true">' + t.icon + '</span><div><h3>' + esc(t.titre) + '</h3><p>' + esc(t.texte) + '</p></div></div>'; }).join('');
    $('#acteurs').innerHTML = DATA.acteurs.map(function (a) { return '<li><b>' + esc(a.role) + '</b> : ' + esc(a.nom) + '<br><span class="note">' + esc(a.detail) + '</span></li>'; }).join('');
    $('#signalisation').innerHTML = DATA.signalisation.map(function (s) { return '<tr><td>' + esc(s.position) + '</td><td>' + esc(s.panneau) + '</td></tr>'; }).join('');
    $('#limite-t').textContent = DATA.traverse.limiteTonnes + ' t';
    $('#traverse-desc').textContent = DATA.traverse.description;
    $('#traverse-sens').textContent = DATA.traverse.sens;
    var ar = DATA.arrete;
    $('#arrete-periode').textContent = ar.periode;
    $('#arrete-rd34').textContent = ar.rd34;
    $('#arrete-rd159').textContent = ar.rd159;
    $('#arrete-exceptions').textContent = ar.exceptions;
    $('#corridors').innerHTML = ar.corridors.map(function (c) { return '<div class="carte"><h3><span class="badge" style="background:var(--sapin)">' + esc(c.id) + '</span> ' + esc(c.titre) + '</h3><p>' + esc(c.trajet) + '</p></div>'; }).join('');
    var c = DATA.commune, contact = '<b>' + esc(c.adresseMairie) + '</b>';
    if (c.telephone) contact += '<br>Téléphone : ' + esc(c.telephone);
    if (c.courriel) contact += '<br>Courriel : <a href="mailto:' + esc(c.courriel) + '">' + esc(c.courriel) + '</a>';
    $('#contact').innerHTML = contact;
    $('#annee').textContent = new Date().getFullYear();
  }

  /* ---------- démarrage ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    remplirSelects();
    afficherEtatJour();
    afficherCalendrier();
    afficherContenus();
    initCarte();
    $('#btn-geo').addEventListener('click', geolocaliser);
    $('#form-itineraire').addEventListener('submit', function (ev) { ev.preventDefault(); calculerItineraire(); });
    $('#date').addEventListener('change', function () { afficherFermetures(RT.etatPourDate(DATA, this.value || aujourdhui()).etat); });
    $('#btn-inverser').addEventListener('click', function () {
      var d = $('#depart').value; $('#depart').value = $('#arrivee').value; $('#arrivee').value = d;
      positionUtilisateur = null; $('#geo-info').textContent = ''; if (marqueurPos) { map.removeLayer(marqueurPos); marqueurPos = null; }
    });
    document.querySelectorAll('[data-exemple]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = this.getAttribute('data-exemple').split('|');
        $('#depart').value = p[0]; $('#arrivee').value = p[1]; if (p[2]) $('#date').value = p[2];
        if (p[3]) { var i = document.querySelector('input[name=vehicule][value=' + p[3] + ']'); if (i) i.checked = true; }
        positionUtilisateur = null; $('#geo-info').textContent = '';
        calculerItineraire();
        $('#itineraire').scrollIntoView({ behavior: 'smooth' });
      });
    });
    calculerItineraire();
  });
})();
