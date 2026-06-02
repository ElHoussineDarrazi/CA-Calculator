# CA Portage

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

## Formule

```
Montant mensuel = (TJM × nombre de jours travaillés) × (commission portage / 100)
```

Exemple : TJM 500 €, 20 jours, commission 85 % → `(500 × 20) × 0,85 = 8 500 €`
