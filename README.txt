SCRATCH PRACTICE — V91
======================

Looper cassette et Chopper local construits avec Web Audio. Le projet fonctionne
sans serveur applicatif et n'envoie pas les fichiers audio vers un service distant.

FONCTIONS PRINCIPALES
---------------------
- Looper avec PREV / PLAY / STOP / NEXT et AUTO +1 % toutes les 8 boucles.
- Lecteur cassette pixel art avec compteur mécanique, porte EJECT et imports intégrés.
- Beat Crate en tranches de boîtiers cassette, rangées dans trois colonnes de quatre slots.
- Trois beats WAV inclus et disponibles hors connexion après mise en cache.
- Chopper 16 pads, waveform, marqueurs, pitch, volume et grille de deux mesures.
- Drum machine, bibliothèques locales, vélocité, reverb, PUNCH et export WAV.
- Interface responsive pour ordinateur et téléphone.

LANCER LE PROJET
----------------
Option simple : ouvrir index.html dans un navigateur moderne.

Option recommandée depuis le dossier du projet :

    python3 -m http.server 8080

Puis ouvrir :

    http://localhost:8080

Le serveur local permet de tester correctement le manifest et le service worker.
Chrome ou Edge est recommandé pour l'écriture directe dans un dossier local.

STRUCTURE
---------
- index.html                 structure de l'interface
- css/src/                   sources CSS par composant
- css/base.css               feuille de style générée et déployable
- js/core.js                 état audio partagé, vumètres et export WAV
- js/looper.js               bibliothèque, imports et transport cassette
- js/chopper.js              waveform, chops, pads et grille
- js/drums.js                grooves, sons locaux, effets et rendu
- js/events.js               liaisons UI et démarrage
- js/practice.js             page Practice gelée en attente de refonte
- assets/beats/              trois beats WAV inclus
- tests/                     validations statiques, unitaires et navigateur
- tools/                     build CSS et lanceur de tests

MODIFIER LE CSS
---------------
Ne pas modifier css/base.css directement. Modifier le fichier propriétaire dans
css/src/, puis reconstruire :

    python3 tools/build_css.py

TESTS DE NON-RÉGRESSION
-----------------------
Lancer la suite complète :

    python3 tools/test_all.py

La suite vérifie notamment :
- synchronisation du build CSS et santé de la cascade ;
- chemins de ressources, service worker et serveur HTTP local ;
- syntaxe JavaScript, déclarations mortes et résidus de debug ;
- utilitaires audio, garde-fous fichiers et export WAV ;
- présence, format et durée des trois beats inclus ;
- contrats Looper, Chopper, Drums, Practice et responsive ;
- fumées navigateur lorsque Playwright et Chromium sont disponibles.

FIABILITÉ LOOPER V91
--------------------
- chargements de pistes concurrents ordonnés : la dernière sélection gagne ;
- PLAY asynchrone annulable par STOP et double PLAY limité à une seule source ;
- PREV/NEXT alignés sur la recherche et le tri visibles dans la Beat Crate ;
- IndexedDB réessayable après échec, erreur de quota conservée précisément ;
- sauvegardes horodatées à la milliseconde et écriture interrompue proprement ;
- première piste importée réutilise le buffer déjà décodé ;
- contrôles cassette accessibles sans bouton Delete imbriqué dans un faux bouton ;
- anciennes couches CSS Looper devenues inopérantes supprimées ;
- première frontière clarifiée : l'affichage cassette appartient désormais au Looper ;
- aucune modification visuelle, CSS ou algorithmique dans cette passe.
