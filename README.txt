SCRATCH PRACTICE / LOOPER666
============================

Scratch looper et beat maker local-first construit avec Web Audio.

Le but du projet est simple : proposer une bibliothèque compacte de beats prêts à
scratcher, puis permettre de fabriquer rapidement de nouveaux beats avec le Chopper
et la Drum Machine pour les ajouter à cette bibliothèque.

PRINCIPES DU PRODUIT
--------------------
- Gratuit et sans publicité.
- Pas de compte obligatoire.
- Pas d'analytics, de télémétrie ou de scripts tiers.
- Les fichiers audio restent locaux : le projet ne nécessite pas d'API serveur pour
  traiter ou envoyer les beats.
- Interface pensée comme un petit instrument de scratch, pas comme une DAW généraliste.

ÉTAT ACTUEL
-----------

LOOPER
- Beat Crate locale avec recherche, tri et imports audio.
- Lecture PREV / PLAY / STOP / NEXT dans une interface cassette.
- AUTO SPEED pour faire évoluer progressivement la vitesse du beat.
- Cache local IndexedDB et connexion optionnelle à un dossier de beats local.
- Compteur de bande et transport adaptés au travail de scratch.

CHOPPER / BEAT MAKER
- Chargement d'un sample local avec waveform et marqueurs.
- Détection de transients, AUTO CHOP et 16 pads.
- Pitch, volume, grille de deux mesures et placement des chops.
- Drum Machine avec kicks, snares et hats provenant de dossiers locaux.
- Génération rapide de patterns, édition des steps et vélocités, effets et PUNCH.
- Preview du beat complet ou des drums seuls.
- Rendu et export WAV du beat courant, avec sauvegarde possible dans un dossier local.

AUTRE
- Interface responsive ordinateur / téléphone.
- Mode Practice séparé.
- Manifest PWA conservé ; le service worker est actuellement en mode retraite pour
  éviter les anciennes ressources en cache pendant les mises à jour GitHub Pages.

DIRECTION PRODUIT
-----------------
La cible est une bibliothèque d'environ 30 à 50 beats sélectionnés pour le scratch,
avec un workflow très court :

    choisir un beat -> scratcher

ou

    charger/chopper un sample -> générer/éditer les drums -> écouter -> sauvegarder
    -> retrouver le nouveau beat dans la bibliothèque

Le pack de 30 à 50 beats n'est pas encore livré dans ce dépôt. Aujourd'hui, les beats
sont importés par l'utilisateur ou lus depuis sa bibliothèque locale. Le pack fait
partie de la direction produit, pas de l'état actuel du runtime.

LANCER LE PROJET
----------------
Le projet est une application statique. Aucun serveur applicatif n'est nécessaire.

Option simple : ouvrir index.html dans un navigateur moderne.

Option recommandée depuis le dossier du projet :

    python3 -m http.server 8080

Puis ouvrir :

    http://localhost:8080

Le serveur local permet de tester correctement le manifest et les APIs navigateur.
Chrome ou Edge est recommandé pour les fonctions d'accès direct aux dossiers locaux.

STRUCTURE ACTUELLE
------------------
- index.html                 structure principale de l'interface
- css/base.css               styles principaux
- css/clean-ui.css           ajustements d'interface actuels
- js/bootstrap.js            démarrage de l'application
- js/core.js                 audio partagé, utilitaires, vumètres et export WAV
- js/looper.js               Beat Crate, imports, persistance et transport cassette
- js/chopper.js              waveform, samples, chops, pads et grille
- js/drums.js                drums, effets et rendu combiné Chopper + Drums
- js/events.js               wiring UI et quelques orchestrations restantes
- js/practice.js             mode Practice
- assets/                    images de l'interface cassette
- docs/                      architecture, sécurité et notes techniques
- tests/                     validations statiques, unitaires et navigateur

Pour l'architecture : docs/ARCHITECTURE.md sert de guide de lecture,
docs/STATE_DEPENDENCY_MAP.md décrit le graphe réel courant et
docs/TARGET_ARCHITECTURE.md fixe la direction cible.
- tools/test_all.py          lanceur de la suite de tests

Il n'y a actuellement pas de pipeline de génération CSS : les feuilles déployées dans
css/ sont les fichiers maintenus par le projet.

RÈGLE DE MAINTENANCE DES UPDATES
--------------------------------
Quand une fonctionnalité, un mécanisme ou un chemin d'exécution est remplacé, l'ancien
code doit être supprimé dans le même changement. Ne pas conserver sans justification
explicite d'ancien listener, fallback, registration, import, fichier JS/CSS, branche ou
chemin de cache devenu inutile.

Une compatibilité ou un code de retraite temporaire peut rester uniquement si sa raison
est documentée directement dans le code. Le service worker racine est actuellement un
exemple volontaire : il existe pour désactiver les anciens workers déjà installés.

Le test tests/dead_code.py impose deux garde-fous simples :
- chaque fichier runtime js/*.js et css/*.css doit rester atteignable depuis index.html ;
- un mécanisme explicitement retiré, comme serviceWorker.register dans le JS applicatif,
  ne doit pas réapparaître ailleurs.

Avant de terminer une update qui remplace du code, rechercher aussi les anciens noms de
fichiers, symboles et chemins concernés et supprimer les reliquats dans le même commit.

TESTS DE NON-RÉGRESSION
-----------------------
Lancer la suite complète :

    python3 tools/test_all.py

La suite maintenue couvre notamment :
- chemins de ressources et service worker ;
- absence de fichiers runtime JS/CSS orphelins après les updates ;
- contrat runtime et santé JavaScript ;
- utilitaires audio et export ;
- régressions Looper / transport / AUTO ;
- santé et responsive CSS ;
- Chopper, Drum Machine, PUNCH et master ;
- serveur HTTP local ;
- démarrage et interactions dans Chromium via Playwright.

GitHub Actions exécute la même suite sur les pull requests et sur les pushes vers main.

DONNÉES LOCALES ET CONFIDENTIALITÉ
----------------------------------
Les samples et beats sont choisis explicitement par l'utilisateur. Les imports peuvent
être conservés dans IndexedDB ou dans un dossier local selon le workflow choisi.
L'application ne contient actuellement ni analytics, ni télémétrie, ni WebSocket, ni
appel vers une API distante, ni script tiers.

Voir docs/SECURITY.md pour le modèle de sécurité et les limites des accès fichiers.
