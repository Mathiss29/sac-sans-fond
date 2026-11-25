# Sac sans Fond (nom provisoire)

Jeu incrémental de butin en fantasy. Largue tes héros sur le champ de bataille, ils combattent seuls des créatures élémentaires. Passe le gant sur les pièces pour remplir le sac magique du vieux mage. À la fin du chrono, le sac se déchire et tout son contenu jaillit : rafle un maximum de pièces, puis dépense-les dans l'Atelier du mage pour repartir plus fort.

## Jouer

Le jeu tourne dans le navigateur, sans installation. Les fichiers utilisent des modules JavaScript, il faut donc les servir via un petit serveur local plutôt que d'ouvrir `index.html` directement :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.

Contrôles : clic sur la carte pour larguer le héros choisi (1 à 4 ou clic sur sa carte pour changer), ZQSD / WASD / flèches ou boutons des bords pour se déplacer, clic sur la mini-map pour y aller, survol pour ramasser les pièces, clic maintenu ou Espace pour l'Attraction (rayon doublé).

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `src/data.js` | Toutes les données d'équilibrage : paliers du sac, ennemis, héros, contrées, nœuds de l'Atelier |
| `src/game.js` | Logique d'une expédition : apparitions, combat, récolte, sac, Déchirure |
| `src/sprites.js` | Pixel art maison (héros, élémentaires, pièce) et dessin procédural du sac et de la map |
| `src/render.js` | Dessin sur le canvas, caméra |
| `src/main.js` | Boucle à pas fixe, entrées, interface (HUD, Atelier, bilan) |
| `src/save.js` | Sauvegarde locale versionnée |

## Musique

Les trois morceaux de `assets/music/` sont de Mathis, créés avec Suno (abonnement Pro) :

- **Atelier** : *Pixel Meadow*
- **Expédition** : *Fantasy Battle Arp*
- **Boss** (près de sa clairière) : *Pixel Demons Rage*

Le bouton 🔊 coupe musique et bruitages.

## Feuille de route

1. **Boucle de base** (fait) : une contrée, trois familles d'élémentaires, archers, sac à paliers, Déchirure, Atelier, sauvegarde, pixel art maison, grande map avec caméra et mini-map.
2. **Progression** (cette version) : mage, chevalier et barde, 4 paliers du sac, gueule du sac améliorable, premier boss primordial, feu follet doré, Atelier de 22 nœuds.
3. Contrées : 5 régions avec leur boss, bourrer le sac, sons et effets.
4. Profondeur : événements, équipement, Curiosités, colporteur, grimoire.
5. Équilibrage, version web publique, puis .exe avec Electron.
