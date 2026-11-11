# Notifications Manhwa — Canal des constellations

Diffusez **en direct** aux joueurs des notifications « fenêtre système » à la manière des manhwas (Omniscient Reader's Viewpoint) : une carte animée apparaît sur l'écran des joueurs ciblés, avec son, durée et couleurs choisies par le MJ.

Foundry VTT v12 / v13 · indépendant du système de jeu.

## Installation

Manifeste : `https://github.com/blendbastien/notifications-manhwa/releases/latest/download/module.json`

## Utilisation (MJ)

Bouton **Notifications Manhwa — diffuser** dans les contrôles de scène (groupe Notes), ou raccourci clavier configurable.

1. **Mode émetteur** (13 modes : une constellation, une catégorie, anonyme, silencieuse, une poignée, quelques-unes, une minorité, plusieurs, de nombreuses, une majorité, deux rivales, la quasi-totalité, toutes). L'accord du pluriel est automatique.
2. **Registre** : dossiers (catégorie narrative Nébuleuse / Voie / Abysse) et constellations, livré avec 26 dossiers et 259 constellations. Le registre est stocké dans le monde.
3. **Bibliothèque** : plus de 500 variantes classées (approbation, désapprobation, surprise, prophétie, sponsoring, régression, abysse, scénarios, alertes…), filtrables. Le bouton **+ Mes messages** conserve vos propres textes.
4. **Message** éditable, balises de couleur `{or}…{/or}` `{sang}` `{cyan}` `{violet}` `{vert}` `{bleu}` `{rose}` `{argent}`, retours à la ligne, incarnation ciblée `%I`, montant `%G`.
5. **Apparence** : 22 thèmes + thème **personnalisé** (couleur de fond + couleur de lueur), 5 polices, étiquette de catégorie, textes des barres haute et basse, image optionnelle au-dessus du texte.
6. **Diffusion** :
   - destinataires : tous les joueurs, sélection de joueurs, propriétaires des tokens sélectionnés, « afficher aussi chez moi » ;
   - durée en secondes (0 = reste affichée jusqu'au clic), fermeture au clic autorisée ou non ;
   - position (haut / centre / bas), largeur, échelle ;
   - **son** : 15 sons synthétisés livrés (neutre, système, doux, cloche, upbeat, victoire, mystique, alerte, danger, échec, ominous, sombre, abysse, tambour, glitch) ou un fichier audio de votre choix ; volume ; bouton Écouter ;
   - copie dans le chat (carte stylisée, bouton **RÉAFFICHER**, chuchotée aux destinataires si la diffusion est ciblée).
7. **Préréglages** : enregistrez des ambiances complètes (thème, couleurs, police, son, volume, durée, position, taille, textes) et rechargez-les d'un clic.
8. **Historique** : les 60 dernières diffusions, avec **Charger** (remet tout dans l'outil) et **Rejouer**.
9. **Exporter l'image** (PNG / WebP / JPEG) reste disponible pour un usage hors Foundry.

Les réglages de diffusion sont mémorisés entre deux sessions.

## Côté joueur

- La carte s'affiche par-dessus l'interface ; barre de temps ; clic pour fermer si autorisé. Au-delà de N notifications simultanées (réglage), les suivantes font la queue.
- **Journal des notifications** (bouton dans les contrôles de scène, ou raccourci) : toutes les notifications reçues, cliquer pour réafficher. Peut être désactivé par le MJ.
- Réglages client : couper les sons, volume multiplicateur.

## Réglages du monde

Journal pour les joueurs · taille du journal · notifications simultanées · API ouverte aux joueurs (diffusions déclenchées par d'autres modules côté joueur) · nom d'expéditeur dans le chat.

## API (pour macros et autres modules)

```js
const api = game.modules.get("notifications-manhwa").api;
await api.notify({
  text: "[Vous avez atteint le palier {or}Force 10{/or}.]",
  theme: "or",                 // ou colors: { main: "#20c060", glow: "#c0ffd0" }
  font: "system",              // system | cosmic | classic | mono | impact
  sound: "victoire", volume: 80,
  duration: 6, dismiss: true, position: "center", width: 760, zoom: 100,
  targets: "all",              // ou [userId, ...]
  gmToo: true, chat: false,
  top: "SYS::CONSTELLATION_LINK", bot: "CONSTELLATION.NETWORK · NOTIFICATION.SYS",
  cat: { ic: "☀", nom: "Bien" }, image: ""
});
api.show({ text: "…" });       // affichage local uniquement
api.open(); api.openJournal(); api.themes; api.sounds; api.fonts;
```

Hooks : `notificationsManhwa.broadcast` (émetteur) et `notificationsManhwa.received` (chaque client qui affiche).

## Crédits

Bastien — carte et bibliothèque issues de l'outil « Constellation Notification v3.3 ».
