/* Réseau routier simplifié autour de Monclar-sur-Losse.
   Repères sûrs : voie communale = voie OpenStreetMap 97405593 (RD 34 [0.3314509, 43.5286594] -> RD 159 [0.3338698, 43.5313496]) ;
   emprises de chantier RD 34 PR 27+085 -> 27+375 et RD 159 PR 6+257 -> 6+685 (projet d'arrêté) ; corridors D1 et D2.
   Le carrefour et les limites d'emprise en sont déduits ; les bourgs sont relevés sur la carte de déviation (précision ~500 m).
   Les tracés détaillés sont fournis par le réseau routier réel (OSRM) au moment du calcul. Voir README.md. */
window.MONCLAR_NETWORK = {
 "nodes": {
  "monclar": {
   "name": "Monclar-sur-Losse (carrefour RD 34 / RD 159)",
   "lat": 43.53175,
   "lon": 0.33205,
   "type": "village",
   "approx": false
  },
  "bars": {
   "name": "Bars",
   "lat": 43.51251,
   "lon": 0.29427,
   "type": "village",
   "approx": false
  },
  "pouylebon": {
   "name": "Pouylebon",
   "lat": 43.54857,
   "lon": 0.29379,
   "type": "village",
   "approx": false
  },
  "saint_christaud": {
   "name": "Saint-Christaud",
   "lat": 43.5295,
   "lon": 0.26151,
   "type": "village",
   "approx": false
  },
  "marseillan": {
   "name": "Marseillan",
   "lat": 43.48754,
   "lon": 0.31531,
   "type": "village",
   "approx": false
  },
  "saint_martin": {
   "name": "Saint-Martin",
   "lat": 43.50661,
   "lon": 0.37509,
   "type": "village",
   "approx": false
  },
  "pallanne": {
   "name": "Pallanne",
   "lat": 43.50748,
   "lon": 0.25481,
   "type": "village",
   "approx": false
  },
  "estipouy": {
   "name": "Estipouy",
   "lat": 43.5503,
   "lon": 0.37988,
   "type": "village",
   "approx": false
  },
  "mascaras": {
   "name": "Mascaras",
   "lat": 43.55637,
   "lon": 0.22635,
   "type": "village",
   "approx": false
  },
  "monlezun": {
   "name": "Monlezun",
   "lat": 43.50002,
   "lon": 0.21033,
   "type": "village",
   "approx": false
  },
  "mirande": {
   "name": "Mirande",
   "lat": 43.515,
   "lon": 0.4047,
   "type": "village",
   "approx": false
  },
  "montesquiou": {
   "name": "Montesquiou",
   "lat": 43.57977,
   "lon": 0.32607,
   "type": "village",
   "approx": false
  },
  "laas": {
   "name": "Laas",
   "lat": 43.46916,
   "lon": 0.30909,
   "type": "village",
   "approx": false
  },
  "bassoues": {
   "name": "Bassoues",
   "lat": 43.57995,
   "lon": 0.24357,
   "type": "village",
   "approx": false
  },
  "tillac": {
   "name": "Tillac",
   "lat": 43.47402,
   "lon": 0.27418,
   "type": "village",
   "approx": false
  },
  "laveraet": {
   "name": "Laveraët",
   "lat": 43.53071,
   "lon": 0.20961,
   "type": "village",
   "approx": false
  },
  "marciac": {
   "name": "Marciac",
   "lat": 43.52516,
   "lon": 0.15701,
   "type": "village",
   "approx": false
  },
  "saint_maur": {
   "name": "Saint-Maur",
   "lat": 43.47714,
   "lon": 0.34209,
   "type": "village",
   "approx": false
  },
  "scieurac": {
   "name": "Scieurac-et-Flourès",
   "lat": 43.56018,
   "lon": 0.20316,
   "type": "village",
   "approx": false
  },
  "armous": {
   "name": "Armous-et-Cau",
   "lat": 43.57579,
   "lon": 0.18881,
   "type": "village",
   "approx": false
  },
  "mouches": {
   "name": "Mouchès",
   "lat": 43.55602,
   "lon": 0.41694,
   "type": "village",
   "approx": false
  },
  "berdoues": {
   "name": "Berdoues",
   "lat": 43.4813,
   "lon": 0.40618,
   "type": "village",
   "approx": false
  },
  "ponsampere": {
   "name": "Ponsampère",
   "lat": 43.45512,
   "lon": 0.37701,
   "type": "village",
   "approx": false
  },
  "isle_de_noe": {
   "name": "L'Isle-de-Noé",
   "lat": 43.58619,
   "lon": 0.41335,
   "type": "village",
   "approx": false
  },
  "mielan": {
   "name": "Miélan",
   "lat": 43.4314,
   "lon": 0.3061,
   "type": "village",
   "approx": false
  },
  "br_n": {
   "name": "l'entrée nord du chantier (RD 34)",
   "lat": 43.53244,
   "lon": 0.33218,
   "type": "junction"
  },
  "br_s": {
   "name": "la sortie sud du chantier (RD 34)",
   "lat": 43.52986,
   "lon": 0.33168,
   "type": "junction"
  },
  "br_w": {
   "name": "l'entrée ouest du chantier (RD 159)",
   "lat": 43.53185,
   "lon": 0.32943,
   "type": "junction"
  },
  "br_e": {
   "name": "le raccordement de la voie communale sur la RD 159 (côté est)",
   "lat": 43.53135,
   "lon": 0.33387,
   "type": "junction"
  },
  "j_vc1_34": {
   "name": "le raccordement de la voie communale sur la RD 34 (côté sud)",
   "lat": 43.52866,
   "lon": 0.33145,
   "type": "junction"
  },
  "j_943_159": {
   "name": "le carrefour RD 943 / RD 159 (entre Saint-Christaud et Laveraët)",
   "lat": 43.53002,
   "lon": 0.23568,
   "type": "junction"
  }
 },
 "edges": [
  {
   "a": "br_n",
   "b": "monclar",
   "road": "RD 34",
   "kind": "chantier",
   "axis": "34"
  },
  {
   "a": "monclar",
   "b": "br_s",
   "road": "RD 34",
   "kind": "chantier",
   "axis": "34"
  },
  {
   "a": "br_w",
   "b": "monclar",
   "road": "RD 159",
   "kind": "chantier",
   "axis": "159"
  },
  {
   "a": "monclar",
   "b": "br_e",
   "road": "RD 159",
   "kind": "chantier",
   "axis": "159"
  },
  {
   "a": "br_e",
   "b": "j_vc1_34",
   "road": "Voie communale de traverse (RD 159 ⇄ RD 34)",
   "kind": "traverse",
   "maxWeight": 9,
   "via": [
    [
     43.53,
     0.33266
    ]
   ]
  },
  {
   "a": "montesquiou",
   "b": "pouylebon",
   "road": "RD 34",
   "kind": "rd"
  },
  {
   "a": "pouylebon",
   "b": "br_n",
   "road": "RD 34",
   "kind": "rd"
  },
  {
   "a": "br_s",
   "b": "j_vc1_34",
   "road": "RD 34",
   "kind": "rd"
  },
  {
   "a": "j_vc1_34",
   "b": "bars",
   "road": "RD 34",
   "kind": "rd"
  },
  {
   "a": "bars",
   "b": "marseillan",
   "road": "RD 34",
   "kind": "rd"
  },
  {
   "a": "marseillan",
   "b": "laas",
   "road": "RD 34",
   "kind": "rd"
  },
  {
   "a": "mirande",
   "b": "br_e",
   "road": "RD 159",
   "kind": "rd"
  },
  {
   "a": "br_w",
   "b": "saint_christaud",
   "road": "RD 159",
   "kind": "rd"
  },
  {
   "a": "saint_christaud",
   "b": "j_943_159",
   "road": "RD 159",
   "kind": "rd"
  },
  {
   "a": "j_943_159",
   "b": "laveraet",
   "road": "RD 159",
   "kind": "rd"
  },
  {
   "a": "laveraet",
   "b": "marciac",
   "road": "RD 159",
   "kind": "rd"
  },
  {
   "a": "montesquiou",
   "b": "bassoues",
   "road": "RD 943",
   "kind": "rd",
   "corridor": "D1"
  },
  {
   "a": "bassoues",
   "b": "j_943_159",
   "road": "RD 943",
   "kind": "rd",
   "corridor": "D1"
  },
  {
   "a": "saint_christaud",
   "b": "laas",
   "road": "RD 156",
   "kind": "rd",
   "corridor": "D1"
  },
  {
   "a": "mirande",
   "b": "saint_maur",
   "road": "RD 1021",
   "kind": "rd",
   "corridor": "D2"
  },
  {
   "a": "saint_maur",
   "b": "laas",
   "road": "RD 1021 / RD 16",
   "kind": "rd",
   "corridor": "D2"
  },
  {
   "a": "laas",
   "b": "tillac",
   "road": "RD 16",
   "kind": "rd",
   "corridor": "D2"
  },
  {
   "a": "tillac",
   "b": "monlezun",
   "road": "RD 3",
   "kind": "rd",
   "corridor": "D2"
  },
  {
   "a": "monlezun",
   "b": "marciac",
   "road": "RD 3",
   "kind": "rd",
   "corridor": "D2"
  },
  {
   "a": "saint_maur",
   "b": "mielan",
   "road": "RD 1021",
   "kind": "rd"
  },
  {
   "a": "tillac",
   "b": "mielan",
   "road": "RD 3",
   "kind": "rd"
  },
  {
   "a": "saint_martin",
   "b": "mirande",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "saint_martin",
   "b": "saint_maur",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "pallanne",
   "b": "saint_christaud",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "pallanne",
   "b": "bars",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "pallanne",
   "b": "tillac",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "monlezun",
   "b": "laveraet",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "montesquiou",
   "b": "estipouy",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "estipouy",
   "b": "mirande",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "montesquiou",
   "b": "isle_de_noe",
   "road": "RD 943",
   "kind": "rd"
  },
  {
   "a": "isle_de_noe",
   "b": "mouches",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "mouches",
   "b": "mirande",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "bassoues",
   "b": "mascaras",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "mascaras",
   "b": "pouylebon",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "mascaras",
   "b": "scieurac",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "scieurac",
   "b": "laveraet",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "bassoues",
   "b": "armous",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "armous",
   "b": "scieurac",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "bassoues",
   "b": "marciac",
   "road": "RD 943",
   "kind": "rd"
  },
  {
   "a": "mirande",
   "b": "berdoues",
   "road": "RN 21",
   "kind": "rd"
  },
  {
   "a": "berdoues",
   "b": "ponsampere",
   "road": "RD",
   "kind": "rd"
  },
  {
   "a": "ponsampere",
   "b": "saint_maur",
   "road": "RD",
   "kind": "rd"
  }
 ]
};
