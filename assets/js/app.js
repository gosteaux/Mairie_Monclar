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
  /* ---------- géométrie utilitaire ---------- */
  var M_LAT = 1 / 111320, M_LON = 1 / (111320 * Math.cos(43.53 * Math.PI / 180));
  function deplacer(p, estM, nordM) { return [p[0] + nordM * M_LAT, p[1] + estM * M_LON]; }
  function polaire(p, dist, capDeg) { var b = capDeg * Math.PI / 180; return deplacer(p, dist * Math.sin(b), dist * Math.cos(b)); }
  /* rectangle [lon,lat] le long d'un axe défini par un point, un cap et deux distances */
  function rectangleAxe(origine, cap, de, a, largeur) {
    var p1 = polaire(origine, de, cap), p2 = polaire(origine, a, cap), perp = cap + 90, l = largeur / 2;
    return [polaire(p1, l, perp), polaire(p2, l, perp), polaire(p2, l, perp + 180), polaire(p1, l, perp + 180), polaire(p1, l, perp)]
      .map(function (q) { return [Math.round(q[1] * 1e6) / 1e6, Math.round(q[0] * 1e6) / 1e6]; });
  }
  function capEntre(p, q) { var dE = (q[1] - p[1]) / M_LON, dN = (q[0] - p[0]) / M_LAT; return Math.atan2(dE, dN) * 180 / Math.PI; }
  function distanceM(p, q) { return RT.haversine(p, q) * 1000; }
  function passePres(geom, point, seuilM) { return geom.some(function (g) { return distanceM(g, point) < seuilM; }); }

  /* Zones d'exclusion selon l'état du carrefour et le véhicule : polygones (précis) et points le long
     des mêmes axes (repli si le serveur refuse les polygones : chaque point exclut le tronçon le plus proche) */
  function exclusions(etat, veh, ignorerChantier) {
    var z = DATA.zoneChantier, polys = [], points = [], fermes = DATA.etats[etat].closed;
    function echantillonner(origine, cap, de, a, pas) { for (var d = de; d <= a; d += pas) { var q = polaire(origine, d, cap); points.push({ lat: Math.round(q[0] * 1e6) / 1e6, lon: Math.round(q[1] * 1e6) / 1e6 }); } }
    if (!ignorerChantier) z.branches.forEach(function (br) {
      if (fermes.indexOf(br.axe) === -1) return;
      polys.push(rectangleAxe(z.centre, br.cap, br.de, br.a, z.largeur));
      echantillonner(z.centre, br.cap, br.de + 10, br.a, 30);
    });
    if (veh.maxWeight > DATA.traverse.limiteTonnes && !veh.agri) {
      var vc = z.voieCommunale, L = distanceM(vc.a, vc.b), cap = capEntre(vc.a, vc.b);
      polys.push(rectangleAxe(vc.a, cap, vc.retrait, L - vc.retrait, vc.largeur));
      echantillonner(vc.a, cap, 60, L - 60, 60);
    }
    return { polygones: polys, points: points.slice(0, 50), n: polys.length };
  }

  /* Décodage du tracé Valhalla (polyline, précision 1e-6) */
  function decoderShape(str) {
    var idx = 0, lat = 0, lon = 0, pts = [];
    while (idx < str.length) {
      var b, shift = 0, res = 0;
      do { b = str.charCodeAt(idx++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += (res & 1) ? ~(res >> 1) : (res >> 1); shift = 0; res = 0;
      do { b = str.charCodeAt(idx++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lon += (res & 1) ? ~(res >> 1) : (res >> 1);
      pts.push([lat / 1e6, lon / 1e6]);
    }
    return pts;
  }

  /* Appel du moteur d'itinéraire sur le réseau routier réel (requête GET simple, sans pré-vérification CORS) */
  function appelValhalla(body, signal) {
    var url = DATA.valhallaUrl + '?json=' + encodeURIComponent(JSON.stringify(body));
    return fetch(url, { signal: signal, mode: 'cors' }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) { /* réponse non JSON */ }
        if (!r.ok || !j || !j.trip) {
          var err = new Error(j && j.error ? j.error : 'réponse ' + r.status + (t ? ' : ' + t.slice(0, 120) : ''));
          err.status = r.status; err.code = j && j.error_code; throw err;
        }
        return j.trip;
      });
    });
  }
  function routerReel(points, veh, excl, signal) {
    var costing = veh.id === 'pl' ? 'truck' : (veh.id === 'velo' ? 'bicycle' : 'auto');
    var base = {
      locations: points.map(function (p) { return { lat: Math.round(p[0] * 1e6) / 1e6, lon: Math.round(p[1] * 1e6) / 1e6, type: 'break' }; }),
      costing: costing,
      units: 'kilometers', language: 'fr-FR'
    };
    if (costing === 'truck') base.costing_options = { truck: { weight: 19, height: 4, width: 2.5, length: 12 } };
    var avecPolygones = Object.assign({}, base); if (excl.polygones.length) avecPolygones.exclude_polygons = excl.polygones;
    var avecPoints = Object.assign({}, base); if (excl.points.length) avecPoints.exclude_locations = excl.points;
    var promesse = appelValhalla(avecPolygones, signal);
    if (excl.polygones.length) promesse = promesse.catch(function (e) {
      // le serveur refuse ou ignore les polygones (limites de service) : on exclut les tronçons par des points
      if (e.name === 'AbortError' || (e.status && e.status >= 500)) throw e;
      return appelValhalla(avecPoints, signal);
    });
    return promesse.then(function (trip) {
      var geom = [], etapes = [];
      trip.legs.forEach(function (leg) {
        var pts = decoderShape(leg.shape); if (geom.length) pts = pts.slice(1); geom = geom.concat(pts);
        (leg.maneuvers || []).forEach(function (m) {
          if (m.type === 4 || m.type === 5 || m.type === 6) return; // arrivée
          etapes.push({ instruction: m.instruction, rues: m.street_names || [], km: m.length || 0 });
        });
      });
      return { geom: geom, km: trip.summary.length, min: trip.summary.time / 60, etapes: etapes };
    });
  }

  /* Candidat passant par la voie communale : la cartographie la décrit à sens unique, alors qu'elle est
     ouverte dans les deux sens pendant les travaux ; on route donc jusqu'à chacun de ses raccordements
     et on trace la voie elle-même (environ 360 m) entre ses deux extrémités connues. */
  function routerViaTraverse(depart, arrivee, veh, polys, signal) {
    var vc = DATA.zoneChantier.voieCommunale;
    function tenter(ordre) {
      var p1 = ordre ? vc.b : vc.a, p2 = ordre ? vc.a : vc.b;
      return Promise.all([routerReel([depart, p1], veh, polys, signal), routerReel([p2, arrivee], veh, polys, signal)])
        .then(function (parts) {
          var a = parts[0], b = parts[1], lVc = distanceM(vc.a, vc.b) / 1000;
          if (passePres(a.geom, DATA.zoneChantier.centre, 45) || passePres(b.geom, DATA.zoneChantier.centre, 45)) throw new Error('traverse le chantier');
          return { geom: a.geom.concat([p1, p2], b.geom), km: a.km + lVc + b.km, min: a.min + lVc / 20 * 60 + b.min,
            etapes: a.etapes.concat([{ instruction: 'Prendre la voie communale de traverse (limitée à ' + DATA.traverse.limiteTonnes + ' t)', rues: ['Voie communale RD 159 ⇄ RD 34'], km: lVc }], b.etapes), viaTraverse: true };
        });
    }
    return tenter(true).catch(function () { return tenter(false); }).catch(function () { return null; });
  }

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

    var riverain = (from === 'monclar' || to === 'monclar');
    var nFrom = NET.nodes[from], nTo = NET.nodes[to];
    var depart = (positionUtilisateur && from === positionUtilisateur.villageId) ? [positionUtilisateur.lat, positionUtilisateur.lon] : [nFrom.lat, nFrom.lon];
    var arrivee = [nTo.lat, nTo.lon];
    var nomDepart = (positionUtilisateur && from === positionUtilisateur.villageId) ? 'Votre position (près de ' + nomNoeud(from) + ')' : nomNoeud(from);

    var entete = '<div class="carte etat" style="border-left-color:' + etatDef.couleur + '">' +
      '<h3>' + esc(fmtDate(iso)) + ' <span class="badge" style="background:' + etatDef.couleur + '">' + esc(etatDef.court) + '</span></h3>' +
      '<p><b>' + esc(r.info.titre) + '</b>' + (r.info.semaine ? ' <span class="note">(' + esc(r.info.semaine) + ')</span>' : '') + '<br><span class="note">' + esc(r.info.detail) + '</span></p>';
    zone.innerHTML = entete + '<p class="note" id="note-geom">Calcul du trajet sur le réseau routier…</p></div>';

    // marqueurs départ / arrivée immédiats
    L.circleMarker(depart, { radius: 8, color: '#2e7d32', fillColor: '#2e7d32', fillOpacity: 1 }).bindTooltip('Départ').addTo(coucheSchema);
    L.circleMarker(arrivee, { radius: 8, color: '#c62828', fillColor: '#c62828', fillOpacity: 1 }).bindTooltip('Arrivée').addTo(coucheSchema);
    map.fitBounds(L.latLngBounds([depart, arrivee, DATA.zoneChantier.centre]).pad(0.2));

    var ctrl = new AbortController(); requeteEnCours = ctrl;
    var timer = setTimeout(function () { ctrl.abort(); }, 12000);
    var polys = exclusions(r.etat, veh, riverain);
    var polysNormal = exclusions('normal', veh, true);
    if (!DATA.valhallaUrl || !window.fetch || !window.AbortController) { afficherRepli(entete, from, to, r, veh, riverain, depart); return; }

    var traverseUtile = !riverain && DATA.etats[r.etat].closed.length > 0 && (veh.maxWeight <= DATA.traverse.limiteTonnes || veh.agri);
    Promise.all([
      routerReel([depart, arrivee], veh, polys, ctrl.signal).catch(function (e) { return { erreur: e }; }),
      polys.n === polysNormal.n ? Promise.resolve(null) : routerReel([depart, arrivee], veh, polysNormal, ctrl.signal).catch(function () { return null; }),
      traverseUtile ? routerViaTraverse(depart, arrivee, veh, polys, ctrl.signal) : Promise.resolve(null)
    ]).then(function (res) {
      clearTimeout(timer); if (ctrl !== requeteEnCours) return;
      var direct = res[0].erreur ? null : res[0], viaVc = res[2];
      var choisi = direct;
      if (viaVc && (!direct || viaVc.km < direct.km * 0.97)) choisi = viaVc;
      if (!choisi) throw res[0].erreur || new Error('aucun trajet');
      afficherResultatReel(entete, choisi, res[1], r, veh, riverain, nomDepart, to);
    }).catch(function (err) {
      clearTimeout(timer); if (ctrl !== requeteEnCours) return;
      afficherRepli(entete, from, to, r, veh, riverain, depart, err);
    });
  }

  function alertesCommunes(r, veh, riverain, passeChantier, passeTraverse) {
    var etatDef = DATA.etats[r.etat], html = '';
    if (r.etat !== 'normal' && !passeChantier) html += alerte('attention', '🚧', 'Carrefour de Monclar : <b>' + esc(etatDef.label) + '</b>. Cet itinéraire contourne la zone de travaux.');
    if (r.etat !== 'normal' && passeChantier && !riverain) html += alerte('ok', '✅', 'Votre trajet traverse Monclar par la RD restée ouverte. Roulez au pas dans la zone de chantier et respectez la signalisation.');
    if (riverain && r.etat !== 'normal') html += alerte('danger', '🏠', 'Votre départ ou votre arrivée se situe dans la zone de travaux : l\'accès des riverains est maintenu selon l\'avancement du chantier, rapprochez-vous du chef de chantier ou de la mairie. Le tracé ne tient pas compte des fermetures du carrefour.');
    if (passeTraverse) html += alerte('attention', '⚖️', 'Vous empruntez la <b>voie communale de traverse limitée à ' + DATA.traverse.limiteTonnes + ' t</b> (sauf véhicules agricoles) : voie étroite, roulez au pas et laissez le passage aux engins de chantier.');
    if (veh.id === 'pl') html += alerte('info', '🚛', 'Plus de 9 t : la voie communale de traverse vous est interdite ; l\'itinéraire est calculé avec un profil poids lourd sur les routes départementales.');
    if (veh.id === 'velo') html += alerte('info', '🚲', 'À vélo, le chantier reste infranchissable ; l\'itinéraire est calculé avec un profil cycliste.');
    if (r.etat === 'normal' && r.hors === null && r.periode && r.periode.debut >= '2026-11-07') html += alerte('info', 'ℹ️', 'Fin des travaux principaux : la réouverture complète du carrefour doit être confirmée par la mairie ; sur place, suivez la signalisation (30 km/h).');
    html += alerte('info', '🪧', 'Sur place, suivez la signalisation temporaire et les indications des équipes.');
    return html;
  }

  function afficherResultatReel(entete, res, resNormal, r, veh, riverain, nomDepart, to) {
    var z = DATA.zoneChantier;
    var passeChantier = passePres(res.geom, z.centre, 45);
    var vcMid = [(z.voieCommunale.a[0] + z.voieCommunale.b[0]) / 2, (z.voieCommunale.a[1] + z.voieCommunale.b[1]) / 2];
    var passeTraverse = !!res.viaTraverse || passePres(res.geom, vcMid, 40);
    var fermes = DATA.etats[r.etat].closed;
    var html = entete;
    if (passeChantier && fermes.length && !riverain) {
      html += alerte('danger', '⛔', 'Le trajet calculé par le service traverse la zone de travaux fermée : la fermeture n\'a pas pu être appliquée. Ne suivez pas ce tracé, suivez la déviation signalée sur place.') + '</div>';
      $('#resultat').innerHTML = html;
      L.polyline(res.geom, { color: '#c62828', weight: 4, opacity: .7, dashArray: '6 8' }).addTo(coucheRoute);
      return;
    }
    html += '<div class="kpi"><div><b>' + fmtKm(res.km) + '</b><span>par la route</span></div><div><b>' + fmtMin(res.min) + '</b><span>durée estimée</span></div>';
    if (resNormal && res.km - resNormal.km > 0.3) html += '<div><b>+' + fmtKm(res.km - resNormal.km) + '</b><span>détour dû aux travaux</span></div>';
    html += '</div>';
    html += alertesCommunes(r, veh, riverain, passeChantier, passeTraverse);
    html += '<ol class="etapes">';
    html += '<li><span class="num dep">D</span><span class="route">' + esc(nomDepart) + '<small>Départ</small></span><span></span></li>';
    var n = 0;
    res.etapes.forEach(function (et) {
      if (et.km < 0.05 && n > 0) return;
      n++;
      html += '<li><span class="num">' + n + '</span><span class="route">' + esc(et.instruction) + (et.rues.length ? '<small>' + esc(et.rues.join(', ')) + '</small>' : '') + '</span><span class="km">' + (et.km ? fmtKm(et.km) : '') + '</span></li>';
    });
    html += '<li><span class="num arr">A</span><span class="route">' + esc(nomNoeud(to)) + '<small>Arrivée</small></span><span></span></li></ol>';
    html += '<p class="note">Itinéraire calculé sur le réseau routier OpenStreetMap (moteur Valhalla) en excluant les tronçons fermés. Itinéraire indicatif : la signalisation en place prévaut.</p></div>';
    $('#resultat').innerHTML = html;
    coucheRoute.clearLayers();
    L.polyline(res.geom, { color: '#fff', weight: 10, opacity: .6 }).addTo(coucheRoute);
    var line = L.polyline(res.geom, { color: '#1e4b3d', weight: 6, opacity: .9 }).addTo(coucheRoute);
    map.fitBounds(line.getBounds().pad(0.12));
  }

  /* Repli : itinéraire schématique sur le graphe local si le service est indisponible */
  function afficherRepli(entete, from, to, r, veh, riverain, depart, err) {
    var res = RT.calculer(NET, DATA, { from: from, to: to, etat: r.etat, vehicule: veh, relaxChantier: riverain });
    var html = entete;
    if (!res.ok) {
      html += alerte('danger', '⛔', 'Le service de calcul est indisponible et aucun itinéraire schématique n\'a été trouvé pour ce véhicule à cette date. Suivez la déviation signalée sur place ou réessayez plus tard.') + '</div>';
      $('#resultat').innerHTML = html; return;
    }
    var etapes = RT.etapes(NET, res);
    var passeChantier = res.edges.some(function (e) { return e.kind === 'chantier'; });
    html += alerte('attention', '📡', 'Le service de calcul sur le réseau routier est momentanément indisponible : voici un <b>itinéraire schématique</b> (villages et routes à suivre), sans tracé détaillé.' + (err && err.message ? '<br><small>Détail technique : ' + esc(err.name === 'AbortError' ? 'délai dépassé (12 s)' : err.message) + '</small>' : ''));
    html += '<div class="kpi"><div><b>≈ ' + fmtKm(res.km) + '</b><span>distance estimée</span></div></div>';
    html += alertesCommunes(r, veh, riverain, passeChantier, !!res.flags.traverse);
    html += '<ol class="etapes"><li><span class="num dep">D</span><span class="route">' + esc(nomNoeud(from)) + '<small>Départ</small></span><span></span></li>';
    etapes.forEach(function (et, i) {
      var sub = (NET.nodes[et.to] && NET.nodes[et.to].type === 'junction' ? 'vers ' : 'jusqu\'à ') + nomNoeud(et.to);
      html += '<li><span class="num">' + (i + 1) + '</span><span class="route">' + esc(et.road) + '<small>' + esc(sub) + '</small></span><span class="km">≈ ' + fmtKm(et.km) + '</span></li>';
    });
    html += '<li><span class="num arr">A</span><span class="route">' + esc(nomNoeud(to)) + '<small>Arrivée</small></span><span></span></li></ol></div>';
    $('#resultat').innerHTML = html;
    var geom = res.geom.slice(); geom[0] = depart;
    var schema = L.polyline(geom, { color: '#1e4b3d', weight: 5, opacity: .8, dashArray: '10 8' }).addTo(coucheSchema);
    map.fitBounds(schema.getBounds().pad(0.15));
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
