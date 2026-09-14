/* Données du chantier – sécurisation de la traversée de Monclar-sur-l'Osse (RD 34 / RD 159).
   Sources : DESC de déviation (CARRERE SAS), planning travaux mis à jour le 04/09/2026,
   plan d'exécution indice B du 03/09/2026 (XMGE), plan de déviation par RD.
   Les dates sont prévisionnelles : la signalisation mise en place sur le terrain prévaut toujours. */
window.MONCLAR_DATA = {
  commune: {
    nom: "Monclar-sur-l'Osse",
    adresseMairie: "Mairie – Au Village, 32300 Monclar-sur-l'Osse",
    /* Renseigner ici le téléphone / courriel de la mairie si souhaité (laisser vide pour ne rien afficher) */
    telephone: "",
    courriel: ""
  },
  acteurs: [
    { role: "Maître d'ouvrage", nom: "Mairie de Monclar-sur-l'Osse", detail: "Au Village – 32300 Monclar-sur-l'Osse" },
    { role: "Maître d'œuvre", nom: "XMGE", detail: "51 rue Montablon – 32500 Fleurance" },
    { role: "Entreprise de travaux", nom: "CARRERE SAS", detail: "391 route de Gimont – 32120 Mauvezin" },
    { role: "Géomètres", nom: "SELARL de Géomètres Experts Associés", detail: "Toulouse · Auch · Condom · Fleurance · Vic-Fezensac" }
  ],
  /* Limite de tonnage de la voie communale reliant la RD 159 (PR 6+319, en agglomération)
     à la RD 34 (PR 27+511, hors agglomération). */
  traverse: {
    limiteTonnes: 9,
    description: "Voie communale reliant la RD 159 (PR 6+319, côté gauche, en agglomération) à la RD 34 (PR 27+511, côté gauche, hors agglomération). Circulation limitée à 9 tonnes, sauf véhicules agricoles."
  },
  vehicules: [
    { id: "vl",   label: "Voiture, moto, utilitaire léger", detail: "≤ 3,5 t", icon: "🚗", maxWeight: 3.5, agri: false },
    { id: "pl9",  label: "Camping-car, fourgon, petit camion", detail: "de 3,5 t à 9 t", icon: "🚐", maxWeight: 9, agri: false },
    { id: "pl",   label: "Poids lourd, autocar, transport scolaire", detail: "plus de 9 t", icon: "🚛", maxWeight: 44, agri: false },
    { id: "agri", label: "Engin agricole", detail: "tracteur, moissonneuse… (non soumis à la limite de 9 t)", icon: "🚜", maxWeight: 44, agri: true },
    { id: "velo", label: "Vélo", detail: "le chantier reste infranchissable", icon: "🚲", maxWeight: 0.1, agri: false }
  ],
  /* États possibles de la traversée du carrefour RD 34 / RD 159 */
  etats: {
    normal:  { label: "Circulation normale", court: "Ouvert", couleur: "#2e7d32", closed: [] },
    p159:    { label: "RD 159 barrée dans la traversée (RD 34 ouverte)", court: "RD 159 barrée", couleur: "#ef6c00", closed: ["159"] },
    p34:     { label: "RD 34 barrée dans la traversée (RD 159 ouverte)", court: "RD 34 barrée", couleur: "#ef6c00", closed: ["34"] },
    total:   { label: "Fermeture totale du carrefour RD 34 / RD 159", court: "Carrefour fermé", couleur: "#c62828", closed: ["34", "159"] },
    zones:   { label: "Fermeture par zones de travail (RD 34 et RD 159) – déviation conseillée", court: "Fermé par zones", couleur: "#c62828", closed: ["34", "159"] }
  },
  /* Périodes (dates incluses, format AAAA-MM-JJ). L'ordre compte : la première période
     qui contient la date est retenue. */
  periodes: [
    { debut: "2026-08-24", fin: "2026-09-13", etat: "normal", semaine: "S35 – S37",
      titre: "Préparation du chantier",
      detail: "Études d'exécution et préparation. Aucune restriction de circulation." },
    { debut: "2026-09-14", fin: "2026-09-20", etat: "p159", semaine: "S38",
      titre: "Installation du chantier et busage des fossés côté RD 159",
      detail: "Installation de la base de vie (14/09), mise en place de la déviation (15–16/09), implantation, début du busage des fossés Ø400 le long de la RD 159 (zones est / ouest). La RD 159 est barrée au niveau de la traversée ; la RD 34 reste ouverte." },
    { debut: "2026-09-21", fin: "2026-09-27", etat: "p34", semaine: "S39",
      titre: "Busage des fossés côté RD 34 et réseaux",
      detail: "Busage des fossés le long de la RD 34 (zones nord / sud), réseaux télécom et eau potable. La RD 34 est barrée au niveau de la traversée ; la RD 159 reste ouverte." },
    { debut: "2026-09-28", fin: "2026-10-04", etat: "p159", semaine: "S40",
      titre: "Réseaux et préparation des bordures est / ouest",
      detail: "Fin des réseaux (télécom, AEP) et préparation des bordures le long de la RD 159 (zones est / ouest). La RD 159 est barrée au niveau de la traversée ; la RD 34 reste ouverte." },
    { debut: "2026-10-05", fin: "2026-10-25", etat: "total", semaine: "S41 – S43",
      titre: "Pose des bordures, îlots, trottoirs, béton désactivé",
      detail: "Pose des bordures est / ouest (265 ml T2 + 70 ml CS1 + 30 ml I2 + 30 ml P1) puis nord / sud (235 ml T2 + 50 ml I2), préparation des îlots et trottoirs, coulage du béton désactivé (15–16/10), finition en terre végétale (19–23/10). Fermeture totale des RD 34 et RD 159 au carrefour." },
    { debut: "2026-10-26", fin: "2026-11-06", etat: "zones", semaine: "S44 – S45",
      titre: "Chaussée, enduits bicouches et signalisation verticale",
      detail: "Préparation de la chaussée (26–30/10), réalisation des enduits bicouches (02/11), pose de la signalisation verticale (03–05/11). Fermetures par zones de travail sur les deux RD : la traversée reste déconseillée, suivez la déviation." },
    { debut: "2026-11-07", fin: "2026-11-22", etat: "normal", semaine: "S46 – S47",
      titre: "Réouverture du carrefour aménagé",
      detail: "Fin des travaux principaux : circulation rétablie sur le nouvel aménagement (vitesse limitée à 30 km/h dans la traversée). Marquage au sol provisoire." },
    { debut: "2026-11-23", fin: "2026-11-27", etat: "normal", semaine: "S48",
      titre: "Signalisation horizontale (marquage au sol)",
      detail: "Réalisation du marquage définitif : circulation possible avec gêne ponctuelle (alternat)." }
  ],
  avantChantier: { titre: "Travaux non commencés", detail: "Le chantier débute le 24 août 2026 (préparation) ; les restrictions de circulation commencent le 14 septembre 2026." },
  apresChantier: { titre: "Aménagement terminé", detail: "La traversée sécurisée est en service : vitesse limitée à 30 km/h, trottoirs, îlots et passages piétons." },
  travaux: [
    { icon: "🛣️", titre: "Plateau et chaussée", texte: "Reprise complète de la chaussée du carrefour avec enduit bicouche, resserrement des voies pour réduire la vitesse (zone 30)." },
    { icon: "🚶", titre: "Trottoirs et cheminements", texte: "Création de trottoirs en béton désactivé, bordures T2 / I2 / CS1, bandes podotactiles et passages piétons vers la mairie et l'école." },
    { icon: "🔀", titre: "Îlots et bordures", texte: "Environ 500 m de bordures T2, îlots en béton désactivé armé (18 cm) pour canaliser les trajectoires à l'entrée de l'agglomération." },
    { icon: "💧", titre: "Assainissement pluvial", texte: "Busage des fossés en PEHD Ø400 (environ 340 m), caniveaux CS1, ouvrages de sortie maçonnés." },
    { icon: "🌿", titre: "Espaces verts", texte: "Massifs et espaces verts en terre végétale sur les îlots et les rives." },
    { icon: "🪧", titre: "Signalisation", texte: "Signalisation verticale (B14 30 km/h, B15, C18, C6 transport scolaire), marquage au sol blanc et jaune, œils-de-chat." }
  ],
  chiffres: [
    { valeur: "24 août → fin nov. 2026", legende: "durée prévisionnelle du chantier" },
    { valeur: "5 semaines", legende: "de fermeture du carrefour (5 oct. → 6 nov.)" },
    { valeur: "500 ml", legende: "de bordures posées" },
    { valeur: "9 t", legende: "limite sur la voie communale de traverse" },
    { valeur: "30 km/h", legende: "vitesse dans la traversée aménagée" }
  ],
  signalisation: [
    { position: "RD 159 à 2 km à l'ouest (Chemin du Rey / Domaine de Menjelon)", panneau: "KC1 « Route barrée à 2 km »" },
    { position: "RD 34 à 1 km au nord (Chemin du Rey)", panneau: "KC1 « Route barrée à 1 km »" },
    { position: "RD 34 à 500 m au sud (Chemin de Bigouroux)", panneau: "KC1 « Route barrée à 500 m »" },
    { position: "RD 159 à 2 km à l'est (route de Mirande)", panneau: "KC1 « Route barrée à 2 km »" },
    { position: "Aux 4 entrées de la zone de travaux", panneau: "K8 + B0 + KC1 « Route barrée » + AK14 tri-flash" }
  ],
  documents: [
    { titre: "Planning des travaux (CARRERE SAS, mis à jour le 04/09/2026)", fichier: "docs/planning-travaux-2026-09-04.pdf" },
    { titre: "Plan d'exécution voirie / assainissement – indice B du 03/09/2026 (XMGE)", fichier: "docs/plan-execution-indice-B.pdf" }
  ],
  /* Service de calcul d'itinéraire routier (géométrie des routes). Laisser vide pour désactiver
     et n'afficher qu'un tracé schématique. */
  osrmUrl: "https://router.project-osrm.org/route/v1/driving/",
  tuiles: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© <a href=\"https://www.openstreetmap.org/copyright\">contributeurs OpenStreetMap</a>"
  }
};
