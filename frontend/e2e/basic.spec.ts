import { test, expect } from '@playwright/test';

test.describe('Tests end-to-end basiques - EpiTrello', () => {
  
  test('Test de chargement de la page d\'accueil', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que le titre principal est présent
    await expect(page.locator('h1')).toContainText('EpiTrello');
    
    // Vérifier que les boutons principaux sont présents (utiliser first() pour éviter strict mode)
    await expect(page.getByRole('button', { name: 'Se connecter' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'S\'inscrire' })).toBeVisible();
  });

  test('Test de connexion avec un utilisateur de démo', async ({ page }) => {
    await page.goto('/');
    
    // Cliquer sur Se connecter (utiliser le bouton du header)
    await page.getByRole('button', { name: 'Se connecter' }).first().click();
    
    // Attendre que le modal s'ouvre
    await page.waitForTimeout(1000);
    
    // Utiliser un compte de démo
    await page.click('text=👑 Admin');
    
    // Attendre la connexion
    await page.waitForTimeout(3000);
    
    // Vérifier que l'utilisateur est connecté
    await expect(page.locator('text=admin')).toBeVisible();
  });

  test('Test de création d\'un board simple', async ({ page }) => {
    await page.goto('/');
    
    // Se connecter
    await page.getByRole('button', { name: 'Se connecter' }).first().click();
    await page.waitForTimeout(1000);
    await page.click('text=👑 Admin');
    
    // Attendre que le modal de connexion se ferme et que l'utilisateur soit connecté
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Créer un board
    await page.getByRole('button', { name: 'Nouveau board' }).click();
    
    // Remplir le nom du board
    const boardNameInput = page.locator('input').first();
    await boardNameInput.fill('Mon Board de Test');
    
    // Créer le board
    await page.getByRole('button', { name: 'Créer le board' }).click();
    
    // Attendre et vérifier
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Mon Board de Test')).toBeVisible();
  });

  test('Test de workflow collaboration basique', async ({ page }) => {
    await page.goto('/');
    
    // Étape 1: Se connecter en tant qu'admin
    await page.getByRole('button', { name: 'Se connecter' }).first().click();
    await page.waitForTimeout(1000);
    await page.click('text=👑 Admin');
    
    // Attendre que la connexion soit effective
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Étape 2: Créer un board de collaboration
    await page.getByRole('button', { name: 'Nouveau board' }).click();
    const boardNameInput = page.locator('input').first();
    await boardNameInput.fill('Projet Collaboration');
    await page.getByRole('button', { name: 'Créer le board' }).click();
    await page.waitForTimeout(2000);
    
    // Étape 3: Créer les colonnes de base
    const createColumnsButton = page.getByRole('button', { name: 'Créer colonnes de base' });
    if (await createColumnsButton.isVisible()) {
      await createColumnsButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Étape 4: Vérifier que les colonnes sont créées
    await expect(page.locator('text=À faire')).toBeVisible();
    
    // Étape 5: Créer une carte
    const createCardButton = page.getByRole('button', { name: 'Carte' });
    if (await createCardButton.isVisible()) {
      await createCardButton.click();
      
      // Remplir le titre de la carte
      const cardTitleInput = page.locator('input[placeholder*="titre"], input[placeholder*="Titre"]').first();
      await cardTitleInput.fill('Première tâche du projet');
      
      // Créer la carte
      await page.getByRole('button', { name: 'Créer la carte' }).click();
      await page.waitForTimeout(2000);
      
      // Vérifier que la carte est créée
      await expect(page.locator('text=Première tâche du projet')).toBeVisible();
    }
    
    // Étape 6: Tester l'invitation (sans nécessairement l'accepter)
    const inviteButton = page.getByRole('button', { name: 'Inviter' });
    if (await inviteButton.isVisible()) {
      await inviteButton.click();
      
      // Remplir un email de test
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('collaborateur@test.com');
      
      // Envoyer l'invitation
      await page.getByRole('button', { name: 'Envoyer l\'invitation' }).click();
      await page.waitForTimeout(1000);
      
      // Vérifier qu'un message de succès apparaît ou que le modal se ferme
      // (dépend de l'implémentation exacte)
    }
  });

  test('Test d\'état non connecté', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier qu'on voit le message de bienvenue
    await expect(page.locator('text=Bienvenue sur EpiTrello')).toBeVisible();
    
    // Vérifier que les options de connexion sont disponibles
    await expect(page.getByRole('button', { name: 'Se connecter' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'S\'inscrire' })).toBeVisible();
    
    // Note: Le bouton "Nouveau board" peut être visible mais sans fonction sans connexion
    // On vérifie plutôt qu'il n'y a pas de boards listés
    await expect(page.locator('text=Aucun board disponible')).toBeVisible();
  });
});
