# Sac sans Fond (nom provisoire)

Jeu incrémental de butin en fantasy. Largue tes héros sur le champ de bataille, ils combattent seuls des créatures élémentaires. Passe le gant sur les pièces pour remplir le sac magique du vieux mage. À la fin du chrono, le sac se déchire et tout son contenu jaillit : rafle un maximum de pièces, puis dépense-les dans l'Atelier du mage pour repartir plus fort.

## Jouer

Le jeu tourne dans le navigateur, sans installation. Les fichiers utilisent des modules JavaScript, il faut donc les servir via un petit serveur local plutôt que d'ouvrir `index.html` directement :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.

Contrôles : clic pour larguer un héros, survol pour ramasser les pièces, clic maintenu ou Espace pour l'Attraction (rayon doublé).

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `src/data.js` | Toutes les données d'équilibrage : paliers du sac, ennemis, héros, contrées, nœuds de l'Atelier |
| `src/game.js` | Logique d'une expédition : apparitions, combat, récolte, sac, Déchirure |
| `src/render.js` | Dessin sur le canvas (formes dessinées par le code en attendant les sprites) |
| `src/main.js` | Boucle à pas fixe, entrées, interface (HUD, Atelier, bilan) |
| `src/save.js` | Sauvegarde locale versionnée |

## Feuille de route

1. **Boucle de base** (cette version) : une contrée, trois familles d'élémentaires, archers, sac à paliers, Déchirure, Atelier de 8 nœuds, sauvegarde.
2. Progression : Atelier complet, mage, chevalier et barde, gueule du sac améliorable, bourrer le sac, boss primordiaux, 5 contrées.
3. Sensations : sons, effets, sprites.
4. Profondeur : événements, équipement, Curiosités, colporteur, grimoire.
5. Équilibrage, version web publique, puis .exe avec Electron.
