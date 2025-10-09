import { test, expect } from '@playwright/test';

test.describe('Tests simples - Connexion uniquement', () => {
  
  test('Test de connexion admin uniquement', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier le chargement initial
    await expect(page.locator('h1')).toContainText('EpiTrello');
    
    // Se connecter avec admin
    await page.getByRole('button', { name: 'Se connecter' }).first().click();
    
    // Attendre l'ouverture du modal
    await page.waitForSelector('text=👑 Admin', { timeout: 5000 });
    
    // Cliquer sur Admin
    await page.click('text=👑 Admin');
    
    // Vérifier que l'utilisateur est connecté
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 15000 });
    
    console.log('✅ Test de connexion réussi !');
  });

  test('Test de navigation après connexion', async ({ page }) => {
    await page.goto('/');
    
    // Se connecter
    await page.getByRole('button', { name: 'Se connecter' }).first().click();
    await page.waitForSelector('text=👑 Admin', { timeout: 5000 });
    await page.click('text=👑 Admin');
    
    // Attendre la connexion
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 15000 });
    
    // Vérifier que l'interface change après connexion
    await expect(page.locator('text=Aucun board disponible')).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le bouton Nouveau board est présent
    await expect(page.getByRole('button', { name: 'Nouveau board' })).toBeVisible();
    
    console.log('✅ Test de navigation après connexion réussi !');
  });
});
