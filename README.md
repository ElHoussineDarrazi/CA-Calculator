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

## Lancement en développement

```bash
npm install
npm run electron:dev
```

## Build application (.dmg macOS)

```bash
npm run electron:build
```

Le fichier `.dmg` sera généré dans le dossier `release/`.

## Version web (GitHub Pages)

L'application est aussi accessible en ligne, sans installation, via GitHub Pages :

```
https://elhoussinedarrazi.github.io/CA-Calculator/
```

Le déploiement est automatique : à chaque `push` sur `main`, le workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construit la version
web (`npm run build`) et la publie sur GitHub Pages.

En mode web, les données sont sauvegardées dans le **localStorage** du navigateur
(au lieu du fichier local utilisé par la version desktop).

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

## Formule

```
Montant mensuel = (TJM × nombre de jours travaillés) × (commission portage / 100)
```

Exemple : TJM 500 €, 20 jours, commission 85 % → `(500 × 20) × 0,85 = 8 500 €`
