# EpiTrello

Application de gestion de projet inspirée de Trello.

## Structure
- `frontend/` : Next.js (TypeScript)
- `backend/` : Node.js/Express
- PostgreSQL : base de données

## Démarrage rapide

### Frontend
```
cd frontend
npm run dev
```

### Backend
```
cd backend
node index.js
```

## Configuration PostgreSQL
Créer un fichier `.env` dans `backend/` avec :
```
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=motdepasse
PGDATABASE=epitrello
PGPORT=5432
```

## API Routes

### Colonnes
- `POST /api/columns/create-default` : Créer les colonnes de base (À faire, En cours, Terminé)
- `GET /api/columns` : Récupérer toutes les colonnes

### Cartes
- `POST /api/cards/create-test` : Créer une carte de test
- `GET /api/cards` : Récupérer toutes les cartes
- `GET /api/columns/:columnId/cards` : Récupérer les cartes d'une colonne spécifique

### Initialisation de la base de données
Pour initialiser la base de données avec les colonnes de base :
```bash
cd backend
psql -U postgres -d epitrello -f init.sql
```

## Fonctionnalités implémentées
- ✅ Création des colonnes de base
- ✅ Affichage d'une carte de test
- ✅ Interface frontend avec colonnes et cartes
- 🔄 Assignation des utilisateurs (à venir)
- 🔄 Déplacement des cartes (à venir)

## Comment utiliser l'application

1. **Démarrer le backend** :
   ```bash
   cd backend
   node index.js
   ```

2. **Démarrer le frontend** :
   ```bash
   cd frontend
   npm run dev
   ```

3. **Accéder à l'application** : http://localhost:3000

4. **Créer les colonnes de base** : Cliquez sur "Créer colonnes de base"

5. **Créer une carte de test** : Cliquez sur "Créer carte de test"

## Objectifs
- Gestion agile (milestones, issues)
- Collaboration
- CI/CD
- Amélioration compétences web
