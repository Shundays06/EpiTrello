# GitHub Actions CI/CD pour EpiTrello

Ce projet utilise GitHub Actions pour automatiser les processus de développement et maintenir la qualité du code.

## 🚀 Workflow Configuré

Le fichier `.github/workflows/ci.yml` configure trois jobs principaux :

### 1. **Backend CI** 
- Teste sur Node.js 18.x et 20.x
- Installation automatique des dépendances (`npm ci`)
- Linting du code backend avec ESLint
- Exécution des tests backend
- Audit de sécurité des dépendances

### 2. **Frontend CI**
- Teste sur Node.js 18.x et 20.x  
- Installation automatique des dépendances (`npm ci`)
- Linting du code frontend avec Next.js ESLint
- Build du projet frontend
- Exécution des tests frontend
- Audit de sécurité des dépendances

### 3. **Code Quality & Linting**
- Job de linting global pour les deux projets
- Installation des dépendances pour backend et frontend
- Vérification de la qualité du code
- Audit de sécurité pour détecter les vulnérabilités

## 🔧 Configuration

### Scripts de linting configurés :

**Backend (`/backend/package.json`) :**
```json
{
  "scripts": {
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix"
  }
}
```

**Frontend (`/frontend/package.json`) :**
```json
{
  "scripts": {
    "lint": "next lint",
    "lint:fix": "next lint --fix"
  }
}
```

### Déclencheurs du workflow :

- **Push** sur les branches `main` et `develop`
- **Pull Request** vers la branche `main`

## 📋 Règles ESLint

### Backend
- Standard JavaScript style guide
- Pas de points-virgules (`semi: never`)
- Guillemets simples (`quotes: single`)
- Indentation 2 espaces
- Autorise les noms de variables de DB (`column_id`, `board_id`, etc.)

### Frontend  
- Configuration Next.js recommandée
- Règles TypeScript activées
- Désactivation de certaines règles pour React
- Correction automatique disponible

## ✅ Statut des builds

Chaque commit et pull request déclenche automatiquement :
1. ✅ Installation des dépendances
2. ✅ Vérification du linting 
3. ✅ Build des projets
4. ✅ Exécution des tests
5. ✅ Audit de sécurité

## 🛠️ Commandes utiles

```bash
# Lancer le linting localement
cd backend && npm run lint
cd frontend && npm run lint

# Corriger automatiquement les erreurs
cd backend && npm run lint:fix
cd frontend && npm run lint:fix

# Installer les dépendances
cd backend && npm ci
cd frontend && npm ci
```

## 📊 Badges de statut

Vous pouvez ajouter des badges GitHub Actions dans votre README principal :

```markdown
![CI/CD](https://github.com/Shundays06/EpiTrello/actions/workflows/ci.yml/badge.svg)
```
