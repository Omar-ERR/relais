# Registre des factures reçues — PMU

Application web pour suivre les factures reçues des fournisseurs, réparties
par unité (point de vente), avec suivi du statut payé/impayé, pièce jointe
(PDF/scan) et export CSV pour la comptabilité.

## Stockage des données

**Tout est stocké localement dans le navigateur, il n'y a pas de serveur ni
de base de données.**
- Les unités et les factures (montants, dates, statuts…) sont dans le
  `localStorage` du navigateur.
- Les fichiers joints (PDF, photos de scan) sont dans l'`IndexedDB` du
  navigateur.

Conséquences importantes :
- Les données restent sur l'appareil/navigateur où elles ont été saisies.
  Si tu ouvres l'app sur un autre ordinateur ou dans un autre navigateur,
  tu ne verras pas les mêmes factures.
- Vider le cache/les données du site dans le navigateur supprime les
  factures enregistrées.
- Il n'y a pas de synchronisation entre plusieurs utilisateurs : si
  plusieurs personnes doivent voir les mêmes factures, il faudra à terme
  ajouter une vraie base de données côté serveur.

## Développement local

```bash
npm install
npm run dev
```

## Déploiement sur Vercel

1. Pousse ce dossier sur un dépôt GitHub (ou GitLab/Bitbucket).
2. Sur [vercel.com](https://vercel.com), clique sur "Add New… → Project" et
   importe le dépôt.
3. Vercel détecte automatiquement Vite : garde les réglages par défaut
   (Build Command : `npm run build`, Output Directory : `dist`).
4. Clique sur "Deploy".

Aucune variable d'environnement n'est nécessaire, l'application ne parle à
aucun serveur.
