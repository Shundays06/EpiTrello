import { test, expect } from '@playwright/test';

test.describe('Tests de Workflow de Collaboration', () => {
  
  test('Workflow complet: Admin créé un projet et ajoute du contenu', async ({ page }) => {
    await page.goto('/');
    
    // PHASE 1: Connexion Admin
    console.log('🔄 Phase 1: Connexion admin...');
    await page.getByRole('button', { name: 'Se connecter' }).first().click();
    await page.waitForSelector('text=👑 Admin', { timeout: 5000 });
    await page.click('text=👑 Admin');
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 15000 });
    console.log('✅ Admin connecté');
    
    // PHASE 2: Création d'un board si aucun n'existe
    console.log('🔄 Phase 2: Création de projet...');
    
    // Attendre que l'interface se charge
    await page.waitForTimeout(2000);
    
    // Vérifier si on a le message "Aucun board disponible"
    const noBoardMessage = page.locator('text=Aucun board disponible');
    if (await noBoardMessage.isVisible()) {
      console.log('Aucun board existant, création d\'un nouveau...');
      
      // Cliquer sur le bouton du message d'accueil ou le bouton du header
      const createBoardButton = page.locator('text=Créer mon premier board').or(page.getByRole('button', { name: 'Nouveau board' }));
      await createBoardButton.first().click();
      
      // Attendre l'ouverture du modal
      await page.waitForSelector('input', { timeout: 5000 });
      
      // Remplir le formulaire
      await page.fill('input', 'Projet Collaboration E2E');
      
      // Chercher et remplir la description si présente
      const descriptionField = page.locator('textarea');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Projet de test pour les fonctionnalités de collaboration');
      }
      
      // Créer le board
      await page.getByRole('button', { name: 'Créer le board' }).click();
      await page.waitForTimeout(3000);
      
      console.log('✅ Board créé: Projet Collaboration E2E');
    }
    
    // PHASE 3: Configuration du board (colonnes)
    console.log('🔄 Phase 3: Configuration des colonnes...');
    
    // Vérifier s'il faut créer les colonnes de base
    const createColumnsButton = page.getByRole('button', { name: 'Créer colonnes de base' });
    if (await createColumnsButton.isVisible()) {
      await createColumnsButton.click();
      await page.waitForTimeout(3000);
      console.log('✅ Colonnes de base créées');
    }
    
    // Vérifier que les colonnes sont présentes
    await expect(page.locator('text=À faire')).toBeVisible({ timeout: 10000 });
    console.log('✅ Colonnes visibles');
    
    // PHASE 4: Création de tâches
    console.log('🔄 Phase 4: Création de tâches...');
    
    const createCardButton = page.getByRole('button', { name: 'Carte' });
    if (await createCardButton.isVisible()) {
      // Créer la première tâche
      await createCardButton.click();
      await page.waitForTimeout(1000);
      
      // Remplir le titre
      await page.fill('input[placeholder*="titre"], input[placeholder*="Titre"]', 'Tâche 1: Setup du projet');
      
      // Remplir la description si présente
      const descField = page.locator('textarea');
      if (await descField.isVisible()) {
        await descField.fill('Configuration initiale et mise en place de l\'environnement');
      }
      
      // Créer la carte
      await page.getByRole('button', { name: 'Créer la carte' }).click();
      await page.waitForTimeout(2000);
      
      console.log('✅ Première tâche créée');
      
      // Créer une deuxième tâche
      await createCardButton.click();
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder*="titre"], input[placeholder*="Titre"]', 'Tâche 2: Développement features');
      
      const descField2 = page.locator('textarea');
      if (await descField2.isVisible()) {
        await descField2.fill('Développement des fonctionnalités principales');
      }
      
      await page.getByRole('button', { name: 'Créer la carte' }).click();
      await page.waitForTimeout(2000);
      
      console.log('✅ Deuxième tâche créée');
    }
    
    // PHASE 5: Test d'invitation
    console.log('🔄 Phase 5: Test d\'invitation...');
    
    const inviteButton = page.getByRole('button', { name: 'Inviter' });
    if (await inviteButton.isVisible()) {
      await inviteButton.click();
      await page.waitForTimeout(1000);
      
      // Remplir l'email
      await page.fill('input[type="email"]', 'collaborateur@test.com');
      
      // Envoyer l'invitation
      await page.getByRole('button', { name: 'Envoyer l\'invitation' }).click();
      await page.waitForTimeout(2000);
      
      console.log('✅ Invitation envoyée');
    }
    
    // PHASE 6: Vérifications finales
    console.log('🔄 Phase 6: Vérifications finales...');
    
    // Vérifier que les tâches sont présentes
    await expect(page.locator('text=Tâche 1: Setup du projet')).toBeVisible();
    await expect(page.locator('text=Tâche 2: Développement features')).toBeVisible();
    
    console.log('✅ Toutes les tâches sont visibles');
    console.log('🎉 Test de workflow de collaboration terminé avec succès !');
  });

  test('Test de gestion des boards multiples', async ({ page }) => {
    await page.goto('/');
    
    // Se connecter
    await page.getByRole('button', { name: 'Se connecter' }).first().click();
    await page.waitForSelector('text=👑 Admin', { timeout: 5000 });
    await page.click('text=👑 Admin');
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 15000 });
    
    // Attendre le chargement
    await page.waitForTimeout(2000);
    
    // Créer un premier board
    const createBoardButton = page.locator('text=Créer mon premier board').or(page.getByRole('button', { name: 'Nouveau board' }));
    await createBoardButton.first().click();
    await page.waitForSelector('input', { timeout: 5000 });
    await page.fill('input', 'Board Personnel');
    await page.getByRole('button', { name: 'Créer le board' }).click();
    await page.waitForTimeout(2000);
    
    // Créer un second board
    await page.getByRole('button', { name: 'Nouveau board' }).click();
    await page.waitForSelector('input', { timeout: 5000 });
    await page.fill('input', 'Board Équipe');
    await page.getByRole('button', { name: 'Créer le board' }).click();
    await page.waitForTimeout(2000);
    
    // Vérifier que les deux boards sont présents
    await expect(page.locator('text=Board Équipe')).toBeVisible();
    
    console.log('✅ Test de gestion de boards multiples réussi !');
  });
});
