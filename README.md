# Travaux de la traversée de Monclar-sur-l'Osse – site d'information et d'itinéraires

Site web statique (HTML / CSS / JavaScript, sans dépendance serveur) présentant le projet de
sécurisation du carrefour RD 34 / RD 159 à Monclar-sur-l'Osse (Gers) et permettant aux habitants
des villages voisins (Bars, Pouylebon, Saint-Christaud, …) de trouver **l'itinéraire adapté à leur
véhicule, à la date de leur trajet et à leur destination**.

## Fonctionnalités

- **Bandeau du jour** : état du carrefour à la date de consultation (ouvert, une RD barrée, fermé).
- **Calcul d'itinéraire** sur fond de carte OpenStreetMap (Leaflet) :
  - départ par géolocalisation (« Ma position ») ou choix d'une commune, destination, date, type de véhicule ;
  - prise en compte du **planning de fermeture** (partielle par axe, totale, par zones) ;
  - prise en compte de la **limite de 9 t** sur la voie communale de traverse (sauf véhicules agricoles) ;
  - affichage des tronçons barrés, de la voie communale, des étapes, de la distance et du détour dû aux travaux ;
  - tracé routier détaillé calculé dans le navigateur par le service public OSRM, avec repli sur un tracé schématique si le service est indisponible.
- **Calendrier** des périodes de travaux et des fermetures (semaines 35 à 49 de 2026).
- **Présentation du projet** (aménagements, chiffres clés, acteurs, documents PDF).
- **Déviations** : plans de signalisation, règle des 9 t, itinéraires poids lourds par RD, emplacement des panneaux.
- **Riverains** : accès, transport scolaire, piétons, dates à retenir, contact.

## Mise en ligne

Le site est constitué de fichiers statiques : il suffit de servir le dossier.

- **GitHub Pages** : *Settings → Pages → Source : Deploy from a branch*, choisir la branche et le dossier `/ (root)`.
  Le fichier `.nojekyll` est déjà présent.
- **Hébergement de la commune** : copier l'ensemble du dossier (`index.html`, `assets/`, `docs/`) sur le serveur.
- **Test local** : `python3 -m http.server 8000` puis ouvrir <http://localhost:8000>.

La géolocalisation du navigateur nécessite une page servie en **HTTPS** (GitHub Pages l'est par défaut).

## Structure

```
index.html                  page unique
assets/css/style.css        styles
assets/js/data.js           DONNÉES DU CHANTIER : périodes, états, véhicules, acteurs, textes, URL des services
assets/js/network.js        graphe routier simplifié : communes, jonctions, tronçons et contraintes
assets/js/router.js         moteur d'itinéraire (Dijkstra avec contraintes de date et de tonnage)
assets/js/app.js            interface (formulaire, carte Leaflet, calendrier)
assets/vendor/leaflet/      bibliothèque Leaflet 1.9.4 (licence BSD-2)
assets/img/                 plans et cartes issus des documents du chantier
docs/                       planning et plan d'exécution (PDF)
tests/router.test.js        tests du moteur : `node tests/router.test.js`
```

## Mettre à jour les données

Tout se modifie dans `assets/js/data.js` sans toucher au code :

- **Planning / fermetures** : tableau `periodes` (dates incluses `AAAA-MM-JJ`, état parmi `normal`,
  `p159` (RD 159 barrée), `p34` (RD 34 barrée), `total`, `zones`). En cas de décalage du chantier,
  il suffit de modifier les dates.
- **Contact de la mairie** : `commune.telephone`, `commune.courriel`.
- **Textes** des travaux, chiffres clés, signalisation, documents.
- **Services externes** : `osrmUrl` (calcul du tracé routier ; vider la chaîne pour n'afficher que le
  tracé schématique) et `tuiles` (fond de carte).

Le réseau routier (`assets/js/network.js`) contient les communes (`type: "village"`) et les jonctions
autour du carrefour (`type: "junction"`). Chaque tronçon (`edges`) porte :

- `kind` : `rd` (route départementale), `chantier` (branche du carrefour, fermée selon l'état),
  `traverse` (voie communale limitée en tonnage), `communal` (Chemin du Rey) ;
- `maxWeight` : tonnage maximal autorisé (les véhicules agricoles en sont exemptés) ;
- `via` : points de passage `[lat, lon]` pour guider le tracé.

## Points à vérifier par la mairie

Les documents fournis ne contiennent pas de coordonnées géographiques ; certaines positions ont donc
été estimées et méritent une vérification sur le terrain ou sur le Géoportail :

1. **Coordonnées du carrefour** (`nodes.monclar`, 43,5308 N / 0,3192 E) et des quatre entrées de la
   zone de travaux (`br_n`, `br_s`, `br_w`, `br_e`).
2. **Tracé de la voie communale de traverse** (RD 159 PR 6+319 ⇄ RD 34 PR 27+511) : modélisée entre la
   RD 159 côté mairie / école et la RD 34 environ 200 m au sud du carrefour, conformément au plan de
   déviation. Ajuster `br_e`, `br_s` et le point `via` du tronçon `traverse` si nécessaire.
3. **Chemin du Rey** (RD 34 à 1 km au nord ⇄ RD 159 à 2 km à l'ouest) : jonctions `j_34n_rey`,
   `j_159w_rey` et points `via`. Il est modélisé comme déconseillé aux plus de 9 t.
4. **Position des bourgs** marqués `approx: true` : il s'agit du centre géométrique de la commune,
   qui peut s'écarter du village de quelques centaines de mètres. Remplacer par les coordonnées de la
   mairie pour plus de précision.
5. **Liaisons départementales** utilisées pour les déviations (Pallanne – Bars, Montesquiou – Estipouy –
   Mirande, Saint-Martin, …) : le graphe est volontairement simplifié ; le tracé détaillé est fourni par
   OSRM à partir du réseau OpenStreetMap réel.

## Sources

- DESC de déviation « Monclar-sur-l'Osse – traversée du village » (CARRERE SAS) ;
- Planning des travaux mis à jour le 04/09/2026 (CARRERE SAS) ;
- Plan d'exécution voirie / assainissement indice B du 03/09/2026 (XMGE) ;
- Plan de déviation par RD et zoom sur l'agglomération de Mirande ;
- Limites des communes : © contributeurs OpenStreetMap, via gregoiredavid/france-geojson (ODbL).

## Licences

Code du site : libre de réutilisation par la commune. Leaflet : BSD-2-Clause (voir
`assets/vendor/leaflet/LICENSE`). Fond de carte et données routières : © contributeurs OpenStreetMap,
licence ODbL ; le service de tuiles et le service OSRM de démonstration sont soumis à leurs conditions
d'utilisation respectives (usage modéré).
