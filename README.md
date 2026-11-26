# Sac sans Fond (nom provisoire)

Jeu incrémental de butin en fantasy. Largue tes héros sur le champ de bataille, ils combattent seuls des créatures élémentaires. Passe le gant sur les pièces pour remplir le sac magique du vieux mage. À la fin du chrono, le sac se déchire et tout son contenu jaillit : rafle un maximum de pièces, puis dépense-les dans l'Atelier du mage pour repartir plus fort.

## Jouer

Le jeu tourne dans le navigateur, sans installation. Les fichiers utilisent des modules JavaScript, il faut donc les servir via un petit serveur local plutôt que d'ouvrir `index.html` directement :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.

Contrôles : clic sur la carte pour larguer le héros choisi (1 à 4 ou clic sur sa carte pour changer), ZQSD / WASD / flèches ou boutons des bords pour se déplacer, clic sur la mini-map pour y aller, survol pour ramasser les pièces, clic maintenu ou Espace pour l'Attraction (rayon doublé).

## Antre du boss

Le Brasier primordial ne rôde plus sur la carte : on l'affronte dans son antre, une salle fermée. Le portail de sa clairière s'ouvre la première fois que le sac atteint le palier Soie.

- **Par le portail**, pendant une expédition : un clic dessus fait entrer tes héros dans l'antre. La carte, le sac et leur chrono sont mis en pause, puis tu reviens là où tu étais. Une seule visite par expédition.
- **Par le bouton de l'Atelier** : combat direct, avec tous tes héros à larguer.

Dans l'antre (60 s) : le boss annonce des cercles de feu qui étourdissent les héros pris dedans, et invoque des feux follets à 66 % et 33 % de sa vie, puis attaque plus vite. Vaincu, il lâche une pluie de pièces qui va droit dans la bourse (×3 la première fois) : 8 s pour la rafler.

## Compagnie : équipement et forge

L'Armurerie (branche Équipement de l'arbre, sous les chevaliers) ouvre l'onglet **Compagnie**.

- **Besaces** : en expédition, certains ennemis lâchent une besace qui file seule vers le sac (une garantie à la première expédition armée, jusqu'à 4 par expédition, toujours une sur un boss). À la fin, l'écran **« Sers-toi ! »** montre les objets trouvés avec leur rareté et « Meilleur ! » / « Nouveau ».
- **Objets** : 12 armes (3 par lignée) et 10 charmes, chacun en 4 raretés (commune, rare, épique, légendaire), soit 88 objets. La puissance dépend de la rareté et de ta progression.
- **Emplacements** : une arme par lignée, puis 1 et 2 charmes (nœuds de l'arbre). L'équipement appartient à la lignée.
- **Affinage** (forge) : on affine l'emplacement, pas l'objet (+10 % d'effet par niveau, jusqu'à +15). Sans risque jusqu'à +3, puis chance de réussite décroissante ; un échec garde le niveau et donne +5 % de chance au suivant. Les niveaux avancés coûtent des **éclats**.
- **Recyclage** : transforme les objets en trop en éclats (1, 3, 8 ou 20 selon la rareté).

Icônes provisoires : `tools/dessiner-objets.py` → `assets/sprites/icones/objets.png`.

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `src/data.js` | Toutes les données d'équilibrage : paliers du sac, ennemis, héros, contrées, nœuds de l'Atelier |
| `src/game.js` | Logique d'une expédition : apparitions, combat, récolte, sac, Déchirure |
| `src/sprites.js` | Pixel art maison (héros, élémentaires, pièce) et dessin procédural du sac et de la map |
| `src/render.js` | Dessin sur le canvas, caméra |
| `src/main.js` | Boucle à pas fixe, entrées, interface (HUD, Atelier, bilan) |
| `src/gear.js` | Équipement : catalogue d'objets, raretés, tirage, affinage, bonus |
| `src/company.js` | Onglet Compagnie (équiper, affiner, réserve, recyclage) et écran « Sers-toi ! » |
| `src/save.js` | Sauvegarde locale versionnée |

## Musique

Les trois morceaux de `assets/music/` sont de Mathis, créés avec Suno (abonnement Pro) :

- **Atelier** : *Pixel Meadow*
- **Expédition** : *Fantasy Battle Arp* (crépuscule, neige)
- **Expédition, matin** et **expédition, minuit** : deux morceaux d'ambiance
- **Boss** (dans son antre) : *Pixel Demons Rage*

Le bouton 🔊 coupe musique et bruitages.

## Personnages dessinés

Les planches de `assets/sprites/heros/` (archer) et `assets/sprites/demons/` ont été générées par Mathis avec ChatGPT, puis converties en vrai pixel art (grille, nettoyage du fond, alignement des images) par `tools/convertir-planche-heros.py` et `tools/convertir-planche-ia.py`. Chaque héros a une bande par animation : repos, marche, attaque, coup reçu, victoire.

## Feuille de route

1. **Boucle de base** (fait) : une contrée, trois familles d'élémentaires, archers, sac à paliers, Déchirure, Atelier, sauvegarde, pixel art maison, grande map avec caméra et mini-map.
2. **Progression** (cette version) : mage, chevalier et barde, 4 paliers du sac, gueule du sac améliorable, premier boss primordial, feu follet doré, Atelier de 22 nœuds.
3. Contrées : 5 régions avec leur boss, bourrer le sac, sons et effets.
4. Profondeur : événements, équipement, Curiosités, colporteur, grimoire.
5. Équilibrage, version web publique, puis .exe avec Electron.
