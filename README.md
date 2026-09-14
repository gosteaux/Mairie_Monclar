# Travaux de la traversée de Monclar-sur-Losse – site d'information et d'itinéraires

Site web statique (HTML / CSS / JavaScript, sans dépendance serveur) présentant le projet de
sécurisation du carrefour RD 34 / RD 159 à Monclar-sur-Losse (Gers) et permettant aux habitants
des villages voisins (Bars, Pouylebon, Saint-Christaud, …) de trouver **l'itinéraire adapté à leur
véhicule, à la date de leur trajet et à leur destination**.

## Fonctionnalités

- **Bandeau du jour** : état du carrefour à la date de consultation (ouvert, une RD barrée, fermé).
- **Calcul d'itinéraire** sur fond de carte OpenStreetMap (Leaflet) :
  - départ par géolocalisation (« Ma position ») ou choix d'une commune, destination, date, type de véhicule ;
  - prise en compte du **planning de fermeture** (partielle par axe, totale, par zones) ;
  - prise en compte de la **limite de 9 t** sur la voie communale de traverse (sauf véhicules agricoles) ;
  - affichage des tronçons barrés, de la voie communale, des étapes, de la distance et du détour dû aux travaux ;
  - itinéraire calculé dans le navigateur sur le réseau routier réel par le moteur Valhalla (instance publique FOSSGIS, sans clé), avec polygones d'exclusion sur les branches fermées du carrefour et sur la voie communale pour les plus de 9 t, profil camion pour les poids lourds ; repli sur un itinéraire schématique si le service est indisponible.
- **Calendrier** des périodes de travaux et des fermetures (semaines 35 à 49 de 2026).
- **Présentation du projet** (aménagements, chiffres clés, acteurs).
- **Déviations** : voie communale et règle des 9 t, périmètre du projet d'arrêté, corridors officiels D1 et D2, emplacement des panneaux.
- **Riverains** : accès, transport scolaire, piétons, dates à retenir, contact.

## Mise en ligne (GitHub Pages, gratuit, sans nom de domaine)

Le site est constitué de fichiers statiques : GitHub Pages l'héberge gratuitement en HTTPS,
à l'adresse `https://<compte>.github.io/Mairie_Monclar/`.

1. Dans le dépôt GitHub : **Settings → Pages**.
2. Dans *Build and deployment*, **Source : Deploy from a branch**.
3. Choisir la branche qui contient le site et le dossier **/ (root)**, puis **Save**.
4. Après une à deux minutes, l'adresse publique s'affiche en haut de la page *Pages*.
   Chaque nouvelle modification poussée sur la branche est mise en ligne automatiquement.

**Fin du chantier** : pour retirer le site, revenir dans *Settings → Pages* et choisir
*Source : None* (ou rendre le dépôt privé, ou le supprimer). L'adresse cesse de répondre aussitôt.

Autres options : copier le dossier sur l'hébergement de la commune, ou test local avec
`python3 -m http.server 8000` puis <http://localhost:8000>.

La géolocalisation du navigateur nécessite une page servie en **HTTPS** (GitHub Pages l'est par défaut).

**Poids et mobile** : la page pèse environ 450 ko au premier affichage (dont la bibliothèque de
cartographie), puis charge les tuiles de carte à la demande et les images des plans uniquement
lorsqu'elles arrivent à l'écran. La mise en page s'adapte du téléphone (menu défilant, carte
réduite, formulaire en pleine largeur) à l'écran d'ordinateur.

## Structure

```
index.html                  page unique
assets/css/style.css        styles
assets/js/data.js           DONNÉES DU CHANTIER : périodes, états, véhicules, acteurs, textes, URL des services
assets/js/network.js        graphe routier simplifié : communes, jonctions, tronçons et contraintes
assets/js/router.js         moteur d'itinéraire (Dijkstra avec contraintes de date et de tonnage)
assets/js/app.js            interface (formulaire, carte Leaflet, calendrier)
assets/vendor/leaflet/      bibliothèque Leaflet 1.9.4 (licence BSD-2)
assets/img/                 logo communal (SVG redessiné)
assets/data/communes.js     limites simplifiées des communes (fond de secours)
tests/router.test.js        tests du moteur : `node tests/router.test.js`
```

## Mettre à jour les données

Tout se modifie dans `assets/js/data.js` sans toucher au code :

- **Planning / fermetures** : tableau `periodes` (dates incluses `AAAA-MM-JJ`, état parmi `normal`,
  `p159` (RD 159 barrée), `p34` (RD 34 barrée), `total`, `zones`). En cas de décalage du chantier,
  il suffit de modifier les dates.
- **Contact de la mairie** : `commune.telephone`, `commune.courriel`.
- **Textes** des travaux, chiffres clés, signalisation, périmètre de l'arrêté et corridors de déviation.
- **Services externes** : `valhallaUrl` (calcul d'itinéraire ; vider la chaîne pour n'afficher que
  l'itinéraire schématique) et `tuiles` (fond de carte).
- **Zone de chantier** : `zoneChantier` (centre du carrefour, longueur et orientation des quatre branches
  exclues, extrémités de la voie communale). C'est cette géométrie qui interdit le passage au moteur.

Le réseau routier (`assets/js/network.js`) contient les communes (`type: "village"`) et les jonctions
autour du carrefour (`type: "junction"`). Chaque tronçon (`edges`) porte :

- `kind` : `rd` (route départementale), `chantier` (branche du carrefour, fermée selon l'état),
  `traverse` (voie communale limitée en tonnage) ;
- `maxWeight` : tonnage maximal autorisé (les véhicules agricoles en sont exemptés) ;
- `via` : points de passage `[lat, lon]` pour guider le tracé.

## Repères géographiques utilisés

Les documents du chantier ne comportent pas de coordonnées ; le cahier des charges du 14/09/2026 en fournit
les seules valeurs sûres, qui structurent le réseau :

- **Voie communale de traverse** = voie OpenStreetMap 97405593, de la RD 34 (0,3314509 E / 43,5286594 N,
  PR 27+511) à la RD 159 (0,3338698 E / 43,5313496 N, PR 6+319), au sud-est du carrefour, environ 360 m.
- **Emprises de chantier** (projet d'arrêté) : RD 34 du PR 27+085 au PR 27+375 ; RD 159 du PR 6+257 au PR 6+685.
- **Carrefour RD 34 / RD 159** : déduit de ces repères à 43,53175 N / 0,33205 E (PR estimés 27+163 sur la
  RD 34, dont les PR croissent vers le sud, et 6+473 sur la RD 159, dont les PR croissent vers l'ouest depuis
  Mirande). Les quatre limites de la zone de travaux (`br_n`, `br_s`, `br_w`, `br_e`) en découlent.
- **Bourgs des villages** : relevés sur la carte de déviation calée sur le carrefour (précision de l'ordre de
  500 m) ; Mirande et Miélan d'après leurs coordonnées connues. À remplacer par les nœuds de village
  OpenStreetMap pour plus de précision.
- **Corridors D1 et D2** : décrits par le projet d'arrêté (article 2) ; le tracé détaillé est fourni par le
  réseau routier réel (Valhalla) au moment du calcul.

## Points à vérifier par la mairie

1. Arrêté temporaire signé (numéro, dates) et arrêté communal sur la voie communale : le site présente le
   projet d'arrêté et la règle des 9 t « sauf véhicules agricoles » telle que communiquée le 14/09/2026.
2. Sens de circulation de la voie communale pendant les travaux (modélisée en double sens ; sens unique
   RD 34 → RD 159 en temps normal d'après la cartographie).
3. Calendrier des fermetures par axe (RD 159 en S38 et S40, RD 34 en S39, fermeture totale S41–S43, par
   zones S44–S45) : issu des phases du DESC et du planning du 04/09/2026, à confirmer avec l'entreprise.
4. Réouverture complète après le 20 novembre 2026 : non déduite automatiquement, à confirmer.
5. Liaisons départementales secondaires du graphe (Pallanne – Bars, Montesquiou – Estipouy – Mirande,
   Saint-Martin…) : volontairement limitées ; aucune autre voie communale n'est proposée.

## Sources

- DESC de déviation « Monclar-sur-Losse – traversée du village » (CARRERE SAS) ;
- Planning des travaux mis à jour le 04/09/2026 (CARRERE SAS) ;
- Plan d'exécution voirie / assainissement indice B du 03/09/2026 (XMGE) ;
- Plan de déviation par RD et zoom sur l'agglomération de Mirande ;
- Projet d'arrêté temporaire RD 34 / RD 159 et cahier des charges « Se déplacer pendant les travaux » v1.3 du 14/09/2026 (repères OSM, PR, corridors) ;
- Limites des communes : © contributeurs OpenStreetMap, via gregoiredavid/france-geojson (ODbL).

## Licences

Code du site : libre de réutilisation par la commune. Leaflet : BSD-2-Clause (voir
`assets/vendor/leaflet/LICENSE`). Fond de carte et données routières : © contributeurs OpenStreetMap,
licence ODbL ; le service de tuiles OSM et l'instance Valhalla de FOSSGIS sont soumis à leurs conditions
d'utilisation respectives (usage modéré, attribution).
