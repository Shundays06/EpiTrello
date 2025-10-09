import { test, expect } from '@playwright/test';

test.describe('Tests end-to-end - Workflow de Collaboration EpiTrello', () => {
  
  test.beforeEach(async ({ page }) => {
    // Aller à la page d'accueil
    await page.goto('/');
    
    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle');
  });

  test('Test basique - Chargement de la page d\'accueil', async ({ page }) => {
    // Vérifier que la page d'accueil se charge correctement
    await expect(page.locator('h1')).toContainText('EpiTrello');
    
    // Vérifier que le bouton de connexion est présent
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
    
    // Vérifier que le bouton d'inscription est présent
    await expect(page.getByRole('button', { name: 'S\'inscrire' })).toBeVisible();
  });

  test('Test de connexion avec utilisateur admin par défaut', async ({ page }) => {
    // Cliquer sur le bouton Se connecter
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Vérifier que le modal de connexion s'ouvre
    await expect(page.locator('text=Connexion')).toBeVisible();
    
    // Utiliser les comptes de démo (Admin)
    await page.click('text=👑 Admin');
    
    // Attendre que la connexion soit effective
    await page.waitForTimeout(2000);
    
    // Vérifier que l'utilisateur est connecté (présence du nom d'utilisateur)
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 10000 });
  });

  test('Test de création et gestion d\'un board simple', async ({ page }) => {
    // Se connecter avec l'admin
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.click('text=👑 Admin');
    await page.waitForTimeout(3000);
    
    // Créer un nouveau board
    await page.getByRole('button', { name: 'Nouveau board' }).click();
    
    // Remplir le formulaire de création de board
    await page.fill('input[placeholder*="nom"]', 'Test Board Collaboration');
    await page.fill('textarea[placeholder*="description"]', 'Board de test pour la collaboration');
    
    // Soumettre le formulaire
    await page.getByRole('button', { name: 'Créer le board' }).click();
    
    // Attendre que le board soit créé
    await page.waitForTimeout(2000);
    
    // Vérifier que le board apparaît dans la liste
    await expect(page.locator('text=Test Board Collaboration')).toBeVisible();
  });

  test('Test de création de colonnes par défaut', async ({ page }) => {
    // Se connecter avec l'admin
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.click('text=👑 Admin');
    await page.waitForTimeout(3000);
    
    // Créer un board
    await page.getByRole('button', { name: 'Nouveau board' }).click();
    await page.fill('input[placeholder*="nom"]', 'Board Test Colonnes');
    await page.getByRole('button', { name: 'Créer le board' }).click();
    await page.waitForTimeout(2000);
    
    // Créer les colonnes de base
    await page.getByRole('button', { name: 'Créer colonnes de base' }).click();
    
    // Attendre que les colonnes soient créées
    await page.waitForTimeout(3000);
    
    // Vérifier que les colonnes de base sont présentes
    await expect(page.locator('text=À faire')).toBeVisible();
    await expect(page.locator('text=En cours')).toBeVisible();
    await expect(page.locator('text=Terminé')).toBeVisible();
  });

  test('Test de création de cartes', async ({ page }) => {
    // Se connecter avec l'admin
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.click('text=👑 Admin');
    await page.waitForTimeout(3000);
    
    // Créer un board et des colonnes
    await page.getByRole('button', { name: 'Nouveau board' }).click();
    await page.fill('input[placeholder*="nom"]', 'Board Test Cartes');
    await page.getByRole('button', { name: 'Créer le board' }).click();
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: 'Créer colonnes de base' }).click();
    await page.waitForTimeout(3000);
    
    // Créer une carte
    await page.getByRole('button', { name: 'Carte' }).click();
    
    // Remplir les informations de la carte
    await page.fill('input[placeholder*="titre"]', 'Ma première tâche');
    await page.fill('textarea[placeholder*="description"]', 'Description de ma première tâche');
    
    // Créer la carte
    await page.getByRole('button', { name: 'Créer la carte' }).click();
    
    // Attendre que la carte soit créée
    await page.waitForTimeout(2000);
    
    // Vérifier que la carte est présente
    await expect(page.locator('text=Ma première tâche')).toBeVisible();
  });

  test('Test d\'invitation d\'utilisateur', async ({ page }) => {
    // Se connecter avec l'admin
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.click('text=👑 Admin');
    await page.waitForTimeout(3000);
    
    // Créer un board
    await page.getByRole('button', { name: 'Nouveau board' }).click();
    await page.fill('input[placeholder*="nom"]', 'Board Test Invitations');
    await page.getByRole('button', { name: 'Créer le board' }).click();
    await page.waitForTimeout(2000);
    
    // Inviter un utilisateur
    await page.getByRole('button', { name: 'Inviter' }).click();
    
    // Remplir l'email d'invitation
    await page.fill('input[type="email"]', 'test@example.com');
    
    // Envoyer l'invitation
    await page.getByRole('button', { name: 'Envoyer l\'invitation' }).click();
    
    // Vérifier qu'un message de succès apparaît
    await expect(page.locator('text=Invitation créée avec succès')).toBeVisible({ timeout: 5000 });
  });

  test('Test de workflow complet - admin et utilisateur', async ({ page, context }) => {
    // PHASE 1: Admin crée le projet
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.click('text=👑 Admin');
    await page.waitForTimeout(3000);
    
    // Créer un board de projet
    await page.getByRole('button', { name: 'Nouveau board' }).click();
    await page.fill('input[placeholder*="nom"]', 'Projet Équipe');
    await page.fill('textarea[placeholder*="description"]', 'Projet de collaboration en équipe');
    await page.getByRole('button', { name: 'Créer le board' }).click();
    await page.waitForTimeout(2000);
    
    // Créer les colonnes
    await page.getByRole('button', { name: 'Créer colonnes de base' }).click();
    await page.waitForTimeout(2000);
    
    // Créer quelques tâches initiales
    await page.getByRole('button', { name: 'Carte' }).click();
    await page.fill('input[placeholder*="titre"]', 'Setup projet');
    await page.fill('textarea[placeholder*="description"]', 'Configuration initiale du projet');
    await page.getByRole('button', { name: 'Créer la carte' }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: 'Carte' }).click();
    await page.fill('input[placeholder*="titre"]', 'Développer feature A');
    await page.fill('textarea[placeholder*="description"]', 'Développement de la fonctionnalité A');
    await page.getByRole('button', { name: 'Créer la carte' }).click();
    await page.waitForTimeout(1000);
    
    // Inviter un membre
    await page.getByRole('button', { name: 'Inviter' }).click();
    await page.fill('input[type="email"]', 'member@epitrello.com');
    await page.getByRole('button', { name: 'Envoyer l\'invitation' }).click();
    await page.waitForTimeout(1000);
    
    // Vérifier que l'invitation a été envoyée
    await expect(page.locator('text=Invitation créée avec succès')).toBeVisible();
    
    // PHASE 2: Simulation membre qui rejoint (ouvrir nouvel onglet)
    const newPage = await context.newPage();
    await newPage.goto('/');
    await newPage.waitForLoadState('networkidle');
    
    // Le membre se connecte
    await newPage.getByRole('button', { name: 'Se connecter' }).click();
    await newPage.click('text=👤 Membre');
    await newPage.waitForTimeout(3000);
    
    // Vérifier les invitations (si accessible)
    // En fonction de l'implémentation, le membre pourrait voir le board ou devoir accepter l'invitation
    
    // PHASE 3: Vérifications finales
    // Retour à la page admin pour vérifier que tout est en place
    await page.bringToFront();
    
    // Vérifier que les tâches sont toujours présentes
    await expect(page.locator('text=Setup projet')).toBeVisible();
    await expect(page.locator('text=Développer feature A')).toBeVisible();
    
    await newPage.close();
  });

  test('Test de non-régression - Aucun utilisateur n\'est connecté', async ({ page }) => {
    // Vérifier l'état initial sans connexion
    await expect(page.locator('text=Bienvenue sur EpiTrello')).toBeVisible();
    
    // Vérifier que les fonctionnalités nécessitant une connexion ne sont pas accessibles
    await expect(page.getByRole('button', { name: 'Nouveau board' })).not.toBeVisible();
    
    // Vérifier que les boutons de connexion/inscription sont présents
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'S\'inscrire' })).toBeVisible();
  });
});
