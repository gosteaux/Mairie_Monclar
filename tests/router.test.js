/* Tests du moteur d'itinéraire : `node tests/router.test.js` */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['assets/js/data.js', 'assets/js/network.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const DATA = ctx.window.MONCLAR_DATA, NET = ctx.window.MONCLAR_NETWORK;
const RT = require(path.join(root, 'assets/js/router.js'));
RT.preparer(NET);
const veh = id => DATA.vehicules.find(v => v.id === id);
let fails = 0;
function check(nom, cond, extra) { console.log((cond ? 'OK   ' : 'ECHEC') + ' ' + nom + (extra ? '  ' + extra : '')); if (!cond) fails++; }
const passe = (r, id) => r.ok && r.path.includes(id);
const utilise = (r, kind) => r.ok && r.edges.some(e => e.kind === kind);
const desc = r => r.ok ? r.path.join(' > ') + ' (' + r.km.toFixed(1) + ' km)' : 'aucun (' + r.raison + ')';

// états par date
check('avant chantier -> normal', RT.etatPourDate(DATA, '2026-08-01').etat === 'normal' && RT.etatPourDate(DATA, '2026-08-01').hors === 'avant');
check('14/09 -> RD159 barrée', RT.etatPourDate(DATA, '2026-09-14').etat === 'p159');
check('23/09 -> RD34 barrée', RT.etatPourDate(DATA, '2026-09-23').etat === 'p34');
check('10/10 (samedi) -> total', RT.etatPourDate(DATA, '2026-10-10').etat === 'total');
check('28/10 -> zones', RT.etatPourDate(DATA, '2026-10-28').etat === 'zones');
check('15/11 -> normal', RT.etatPourDate(DATA, '2026-11-15').etat === 'normal');
check('après chantier', RT.etatPourDate(DATA, '2026-12-15').hors === 'apres');

// circulation normale : on passe par Monclar
let r = RT.calculer(NET, DATA, { from: 'pouylebon', to: 'bars', etat: 'normal', vehicule: veh('vl') });
check('normal Pouylebon->Bars passe par Monclar', passe(r, 'monclar'), desc(r));
r = RT.calculer(NET, DATA, { from: 'saint_christaud', to: 'mirande', etat: 'normal', vehicule: veh('vl') });
check('normal St-Christaud->Mirande passe par Monclar', passe(r, 'monclar'), desc(r));

// fermeture totale
r = RT.calculer(NET, DATA, { from: 'mirande', to: 'bars', etat: 'total', vehicule: veh('vl') });
check('total VL Mirande->Bars évite Monclar et utilise la traverse', !passe(r, 'monclar') && utilise(r, 'traverse'), desc(r));
r = RT.calculer(NET, DATA, { from: 'mirande', to: 'bars', etat: 'total', vehicule: veh('pl') });
check('total PL Mirande->Bars sans traverse ni Chemin du Rey, via Saint-Maur', r.ok && !utilise(r, 'traverse') && !utilise(r, 'communal') && passe(r, 'saint_maur'), desc(r));
r = RT.calculer(NET, DATA, { from: 'mirande', to: 'bars', etat: 'total', vehicule: veh('agri') });
check('total tracteur Mirande->Bars autorisé sur la traverse', utilise(r, 'traverse'), desc(r));
r = RT.calculer(NET, DATA, { from: 'pouylebon', to: 'saint_christaud', etat: 'total', vehicule: veh('vl') });
check('total VL Pouylebon->St-Christaud par le Chemin du Rey', utilise(r, 'communal') && !passe(r, 'monclar'), desc(r));
r = RT.calculer(NET, DATA, { from: 'pouylebon', to: 'saint_christaud', etat: 'total', vehicule: veh('pl') });
check('total PL Pouylebon->St-Christaud sans voie communale', r.ok && !utilise(r, 'communal') && !passe(r, 'monclar'), desc(r));
r = RT.calculer(NET, DATA, { from: 'pouylebon', to: 'bars', etat: 'total', vehicule: veh('vl') });
check('total VL Pouylebon->Bars évite Monclar', r.ok && !passe(r, 'monclar'), desc(r));
r = RT.calculer(NET, DATA, { from: 'saint_christaud', to: 'bars', etat: 'total', vehicule: veh('vl') });
check('total VL St-Christaud->Bars via Pallanne', r.ok && !passe(r, 'monclar') && passe(r, 'pallanne'), desc(r));

// fermetures partielles
r = RT.calculer(NET, DATA, { from: 'pouylebon', to: 'bars', etat: 'p159', vehicule: veh('vl') });
check('RD159 barrée : Pouylebon->Bars passe par Monclar (RD34 ouverte)', passe(r, 'monclar'), desc(r));
r = RT.calculer(NET, DATA, { from: 'saint_christaud', to: 'mirande', etat: 'p159', vehicule: veh('vl') });
check('RD159 barrée : St-Christaud->Mirande évite le carrefour', r.ok && !passe(r, 'monclar'), desc(r));
r = RT.calculer(NET, DATA, { from: 'saint_christaud', to: 'mirande', etat: 'p34', vehicule: veh('vl') });
check('RD34 barrée : St-Christaud->Mirande passe par Monclar', passe(r, 'monclar'), desc(r));
r = RT.calculer(NET, DATA, { from: 'pouylebon', to: 'bars', etat: 'p34', vehicule: veh('pl') });
check('RD34 barrée : PL Pouylebon->Bars évite le carrefour', r.ok && !passe(r, 'monclar') && !utilise(r, 'communal'), desc(r));

// riverains
r = RT.calculer(NET, DATA, { from: 'monclar', to: 'mirande', etat: 'total', vehicule: veh('vl'), relaxChantier: true });
check('total riverain Monclar->Mirande trouvé avec drapeau riverain', r.ok && r.flags.riverain, desc(r));
r = RT.calculer(NET, DATA, { from: 'monclar', to: 'mirande', etat: 'total', vehicule: veh('vl') });
check('total Monclar->Mirande sans relax : aucun itinéraire', !r.ok);

// utilitaires
const v = RT.villagePlusProche(NET, 43.512, 0.306);
check('village le plus proche de (43.512, 0.306) = Bars', v.id === 'bars', v.id);
check('étapes regroupées', RT.etapes(NET, RT.calculer(NET, DATA, { from: 'marciac', to: 'mirande', etat: 'total', vehicule: veh('pl') })).length >= 3);
// cohérence du réseau
let orphelins = Object.keys(NET.nodes).filter(id => !NET.adj[id].length);
check('aucun nœud isolé', orphelins.length === 0, orphelins.join(','));
let inaccessibles = Object.keys(NET.nodes).filter(id => id !== 'mirande' && !RT.calculer(NET, DATA, { from: 'mirande', to: id, etat: 'total', vehicule: veh('pl'), relaxChantier: true }).ok);
check('tous les nœuds accessibles en PL pendant la fermeture totale', inaccessibles.length === 0, inaccessibles.join(','));

console.log(fails ? `\n${fails} test(s) en échec` : '\nTous les tests passent');
process.exit(fails ? 1 : 0);
