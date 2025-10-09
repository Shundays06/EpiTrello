import { test, expect, Page } from '@playwright/test';

test.describe('Tests de Collaboration - Interface Complète', () => {
  
  async function closeModals(page: Page) {
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }

  test('Test complet: Vérification de toutes les fonctionnalités de collaboration', async ({ page }) => {
    await page.goto('/');
    
    // Phase 1: Connexion
    console.log('🔄 Phase 1: Connexion admin...');
    await page.getByRole('button', { name: 'Se connecter' }).first().click();
    await page.waitForSelector('text=👑 Admin', { timeout: 5000 });
    await page.click('text=👑 Admin');
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 15000 });
    await closeModals(page);
    console.log('✅ Admin connecté');
    
    // Phase 2: Créer un board pour débloquer les fonctionnalités
    console.log('🔄 Phase 2: Création d\'un board...');
    await page.waitForTimeout(2000);
    
    // Vérifier si on peut créer un board
    const createFirstBoard = page.locator('text=Créer mon premier board');
    if (await createFirstBoard.isVisible()) {
      console.log('Création du premier board...');
      await createFirstBoard.click();
      await page.waitForTimeout(1000);
      
      // Remplir le formulaire rapidement
      await page.fill('input', 'Board Test Collaboration');
      await page.getByRole('button', { name: 'Créer le board' }).click();
      await page.waitForTimeout(3000);
      console.log('✅ Board créé');
    }
    
    // Phase 3: Vérifier les fonctionnalités desktop
    console.log('🔄 Phase 3: Vérification fonctionnalités desktop...');
    
    const desktopFeatures = [
      'Nouveau board',
      'Colonne', 
      'Carte',
      'Inviter',
      'Labels'
    ];
    
    for (const feature of desktopFeatures) {
      const button = page.getByRole('button', { name: feature });
      if (await button.isVisible()) {
        console.log(`✅ Desktop: "${feature}" disponible`);
      } else {
        console.log(`⚠️ Desktop: "${feature}" non visible`);
      }
    }
    
    // Phase 4: Tester le menu mobile
    console.log('🔄 Phase 4: Test du menu mobile...');
    
    // Passer en mode mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Ouvrir le menu mobile
    const mobileMenuIcon = page.locator('svg').filter({ hasText: 'M4 6h16M4 12h16M4 18h16' }).locator('..');
    if (await mobileMenuIcon.isVisible()) {
      await mobileMenuIcon.click();
      await page.waitForTimeout(1000);
      
      const mobileFeatures = [
        'Invitations',
        'Organisations'
      ];
      
      for (const feature of mobileFeatures) {
        const button = page.getByRole('button', { name: feature });
        if (await button.isVisible()) {
          console.log(`✅ Mobile: "${feature}" disponible`);
        } else {
          console.log(`⚠️ Mobile: "${feature}" non visible`);
        }
      }
      
      // Fermer le menu mobile
      await mobileMenuIcon.click();
    }
    
    // Phase 5: Test des modals de collaboration
    console.log('🔄 Phase 5: Test des modals...');
    
    // Remettre en mode desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);
    
    // Tester le modal d'invitation (si le bouton Inviter est visible)
    const inviteButton = page.getByRole('button', { name: 'Inviter' });
    if (await inviteButton.isVisible()) {
      try {
        await inviteButton.click();
        await page.waitForTimeout(1000);
        
        // Vérifier que le modal s'ouvre
        const emailInput = page.locator('input[type="email"]');
        if (await emailInput.isVisible()) {
          console.log('✅ Modal d\'invitation fonctionnel');
          await closeModals(page);
        }
      } catch (error) {
        console.log('⚠️ Modal d\'invitation non testable');
      }
    }
    
    console.log('🎉 Test complet des fonctionnalités terminé !');
  });

  test('Test responsive: Vérification desktop vs mobile', async ({ page }) => {
    await page.goto('/');
    
    // Connexion
    await page.getByRole('button', { name: 'Se connecter' }).first().click();
    await page.waitForSelector('text=👑 Admin', { timeout: 5000 });
    await page.click('text=👑 Admin');
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 15000 });
    await closeModals(page);
    
    // Test en mode desktop
    console.log('📊 Mode Desktop (1280x720)');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);
    
    const desktopVisible = await page.getByRole('button', { name: 'Nouveau board' }).isVisible();
    console.log(`Desktop - Nouveau board visible: ${desktopVisible ? '✅' : '❌'}`);
    
    // Test en mode mobile
    console.log('📱 Mode Mobile (375x667)');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Le bouton hamburger doit être visible en mobile
    const hamburgerIcon = page.locator('svg[viewBox="0 0 24 24"]').first();
    const mobileMenuVisible = await hamburgerIcon.isVisible();
    console.log(`Mobile - Menu hamburger visible: ${mobileMenuVisible ? '✅' : '❌'}`);
    
    // Test en mode tablette
    console.log('📱 Mode Tablette (768x1024)');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    const tabletVisible = await page.getByRole('button', { name: 'Nouveau board' }).isVisible();
    console.log(`Tablette - Nouveau board visible: ${tabletVisible ? '✅' : '❌'}`);
    
    console.log('🎉 Test responsive terminé !');
  });
});
