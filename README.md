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

### Initialisation de la base de données
Pour initialiser la base de données avec les colonnes de base :
```bash
cd backend
psql -U postgres -d epitrello -f init.sql
```

## Fonctionnalités implémentées
- ✅ Création des colonnes de base
- 🔄 Gestion des cartes (à venir)
- 🔄 Assignation des utilisateurs (à venir)
- 🔄 Interface frontend (à venir)

## Objectifs
- Gestion agile (milestones, issues)
- Collaboration
- CI/CD
- Amélioration compétences web
