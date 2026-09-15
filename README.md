# CA Calculator

Application desktop pour suivre votre chiffre d'affaires en portage salarial.

## Fonctionnalités

- **Onglets par client** : un onglet par mission/client
- **Informations client** : nom, date de début, TJM, % commission portage
- **Lignes mensuelles** : depuis la date de début jusqu'au mois en cours
- **Calcul automatique** : `(TJM × jours travaillés) × % commission portage`
- **Suivi des paiements** : case à cocher « Payé par le client » par mois
- **Résumé global** : total CA, montant payé, reste à percevoir
- **Sauvegarde automatique** des données localement

## Lancer l'application

Prérequis (une seule fois) :

```bash
npm install
```

| Ce que vous voulez | Commande | Résultat |
|---|---|---|
| **Développer dans le navigateur** | `npm run dev` | http://localhost:5173 (rechargement à chaud) |
| **Développer en desktop (Electron)** | `npm run electron:dev` | Fenêtre native + DevTools |
| **Vérifier le build web** | `npm run build` puis `npm run preview` | sert `dist/` sur http://localhost:4173 |
| **Créer l'application macOS (.dmg)** | `npm run electron:build` | `release/CA Calculator-1.0.0-arm64.dmg` |

## Build desktop (.dmg macOS)

```bash
npm run electron:build     # équivaut à : vite build && electron-builder
```

Génère dans `release/` :

- **`CA Calculator-1.0.0-arm64.dmg`** → l'installateur à distribuer
- **`mac-arm64/CA Calculator.app`** → l'application, lançable directement

Pour installer : ouvrez le `.dmg`, glissez l'application dans **Applications**, puis lancez-la.

> **Attention : premier lancement** — la build n’est pas signée par un certificat Apple
> (elle utilise une signature `ad-hoc`). macOS affiche donc
> « Apple ne peut pas vérifier que cette app ne contient pas de logiciel malveillant ».
> Faites un **clic droit → Ouvrir** (une seule fois), ou passez par
> Réglages Système → Confidentialité et sécurité → « Ouvrir quand même ».

> ⚠️ **`npm start` ne fonctionne pas seul.** Le code teste
> `isDev = !app.isPackaged` (`electron/main.cjs`) et, en mode non packagé, il charge
> `http://localhost:5173` et ouvre les DevTools. Il faut donc que `npm run dev`
> tourne déjà — c'est exactement ce que fait `npm run electron:dev`.

### Pourquoi les dépendances sont-elles en `devDependencies` ?

Vite **intègre** (`bundle`) React et Firebase directement dans `dist/`.
Or `electron-builder` n'embarque que les `dependencies` de production : en les
laissant dans `dependencies`, l'application gonflait à **144 Mo** avec **127 Mo de
`node_modules` inutiles** (2 060 fichiers, dont tous les paquets `@firebase/*`).

Les déclarer en `devDependencies` ne change **rien** au build web (`npm ci` installe
aussi les `devDependencies`) et fait passer `app.asar` de **127 Mo à 848 Ko**.

Le processus principal (`electron/main.cjs` + `preload.cjs`) n'utilise que des modules
natifs de Node (`path`, `fs`) et `electron` : aucun `node_modules` n'est requis à l'exécution.

## Version web (GitHub Pages)

L'application est aussi accessible en ligne, sans installation, via GitHub Pages :

```
https://elhoussinedarrazi.github.io/CA-Calculator/
```

Le déploiement est automatique : à chaque `push` sur `main`, le workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construit la version
web (`npm run build`) et la publie sur GitHub Pages.

En mode web, les données sont sauvegardées dans le **localStorage** du navigateur
(au lieu du fichier local utilisé par la version desktop). Avec Firebase, elles sont synchronisées dans Firestore — voir la section suivante.

### Activer GitHub Pages (une seule fois)

1. Aller sur le dépôt GitHub → **Settings** → **Pages**.
2. Dans **Build and deployment** → **Source**, choisir **GitHub Actions**.
3. Pousser un commit sur `main` (ou lancer le workflow manuellement depuis
   l'onglet **Actions**) : le site est publié automatiquement.

### Tester la version web en local

```bash
npm run build
npm run preview
```

### Tester depuis un téléphone (réseau local)

```bash
npm run dev -- --host
```

Ouvrez ensuite l'adresse réseau affichée (ex. `http://192.168.1.42:5173`) sur votre téléphone,
connecté au même Wi-Fi. Pratique pour vérifier l'affichage avant de passer à un vrai PWA.

> ⚠️ En HTTP simple, `crypto.randomUUID()` n'existe pas. L'application utilise donc un
> identifiant de secours (`src/utils/uuid.js`) : sans lui, elle planterait au démarrage
> dans ce contexte.
>
> Si vous voulez tester la **synchronisation Firebase** depuis cette adresse, ajoutez l'IP
> dans la console Firebase → **Authentication → Settings → Authorized domains**.

## Synchronisation cloud (Firebase)

L'application peut synchroniser vos données entre le **desktop**, le **web (GitHub Pages)**
et le **mobile** via **Firestore** + **Authentication**.

> 💡 **Sans configuration Firebase, l'application fonctionne exactement comme avant** :
> fichier local sur desktop, `localStorage` dans le navigateur. Aucune régression.

### Mise en place (une seule fois)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Créer un projet**
   (désactivez Google Analytics si inutile).
2. **Build → Firestore Database → Créer une base**
   → mode **production** → région **`europe-west1`** (données hébergées dans l'UE).
3. **Build → Authentication → Commencer** → activer **E-mail/Mot de passe**
   *(n'activez pas les popups : elles sont bloquées dans Electron).*
4. **Paramètres du projet → Vos apps → Web (`</>`)** → enregistrer → copier les 6 valeurs.
5. Créer `.env.local` à partir du modèle :

   ```bash
   cp .env.example .env.local
   # puis renseigner VITE_FIREBASE_* avec les valeurs de l'étape 4
   ```

6. Publier les règles de sécurité (indispensable, voir ci-dessous) :
   **Firestore Database → Règles** → coller le contenu de [`firestore.rules`](firestore.rules) → **Publier**.

### Sécurité — à lire

- La clé `VITE_FIREBASE_API_KEY` **n'est pas un secret** : elle est publique par conception
  et se retrouve dans le bundle. **Ce qui protège vos données, ce sont les règles Firestore.**
- Avec `allow read, write: if true`, **n'importe qui pourrait lire et modifier votre chiffre
  d'affaires**. Les règles fournies limitent chaque compte à son propre espace `users/{uid}`.
- Pour un renfort, activez **App Check** (reCAPTCHA v3) et/ou chiffrez le contenu avant envoi.

### Déploiement web (GitHub Actions)

Les variables doivent être injectées au build. Créez-les dans
**Settings → Secrets and variables → Actions → Variables** :
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) les transmet
déjà à l'étape de build.

### Importer vos données existantes

Au premier lancement, créez votre compte, puis :

1. Cliquez sur **« Importer »** dans l'en-tête.
2. Sélectionnez votre fichier `clients.json` (par défaut :
   `~/Library/Application Support/ca-portage/clients.json` sur macOS).
3. Vérifiez les données, puis cliquez sur **« Enregistrer tout »**
   (ou `⌘S` / `Ctrl+S`) : elles sont alors envoyées dans Firestore
   et deviennent visibles sur tous vos appareils.

Les boutons **« Exporter »** / **« Importer »** servent également de sauvegarde
et de restauration hors-ligne. L'import **fusionne** par identifiant de client :
il remplace les clients de même identifiant et ajoute les nouveaux, sans jamais
supprimer les autres.

### Structure des données dans Firestore

```
users/{uid}/clients/{clientId}   → un document PAR CLIENT
users/{uid}/meta/state           → { activeClientId }
```

Un document par client (plutôt qu'un document unique) évite qu'un appareil écrase
les modifications d'un autre. Seuls les clients réellement modifiés sont réécrits.

## Formule

```
Montant mensuel = (TJM × nombre de jours travaillés) × (commission portage / 100)
```

Exemple : TJM 500 €, 20 jours, commission 85 % → `(500 × 20) × 0,85 = 8 500 €`
