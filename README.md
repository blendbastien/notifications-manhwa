# Notifications — `notifications-manhwa`

Notifications « Système / Constellations » diffusées en direct aux joueurs, avec journal, thèmes et sons.

La documentation détaillée du module est dans `DOCUMENTATION.md`.

Code de la version **1.2.2** (dernière release), pour Foundry VTT v13.

## Liens avec la suite Manhwa

La suite compte un système (Fiche - Manhwa) et 11 modules. La Fiche est le centre : les données partagées y vivent et les modules les lisent via `globalThis.MANHWA`.

- Aucune dépendance. Utilisé par la Fiche, le Gacha et les Scénarios.
- Hooks `notificationsManhwa.broadcast`, `.received`, `.journal`.
- Règle commune : un module ne plante jamais si un autre est absent (vérifier `game.modules.get(id)?.active` avant d'appeler son API).

## Livraison

1. Augmenter `version` dans `module.json` (jamais deux livraisons au même numéro).
2. Construire le zip, qui doit contenir le dossier `notifications-manhwa/` :
   ```bash
   mkdir -p build/notifications-manhwa && git archive HEAD | tar -x -C build/notifications-manhwa
   cd build && zip -qr notifications-manhwa.zip notifications-manhwa
   ```
3. Créer la release GitHub `vX.Y.Z` avec **exactement 2 fichiers** : `module.json` et `notifications-manhwa.zip`. Le manifeste pointe vers `releases/latest/download/…`.
4. The Forge : Bazaar → *Install From Manifest* avec l'URL versionnée `https://github.com/blendbastien/notifications-manhwa/releases/download/vX.Y.Z/module.json`. Ne jamais utiliser *Update All Packages*.
5. Redémarrer le monde de test, vérifier la version installée et tester.
