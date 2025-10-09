import { Page } from '@playwright/test';

/**
 * Helper pour attendre que les éléments se chargent
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Helper pour générer des noms uniques pour les tests
 */
export function generateTestName(prefix: string): string {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}`;
}

/**
 * Helper pour nettoyer après les tests
 */
export async function cleanup(page: Page) {
  // Si connecté, se déconnecter
  try {
    const profileButton = page.locator('text=admin, text=member, text=manager, text=viewer').first();
    if (await profileButton.isVisible({ timeout: 1000 })) {
      await profileButton.click();
      await page.getByRole('button', { name: 'Se déconnecter' }).click();
    }
  } catch {
    // Ignore si pas connecté ou si les éléments n'existent pas
  }
}

/**
 * Helper pour prendre une capture d'écran en cas d'erreur
 */
export async function takeErrorScreenshot(page: Page, testName: string) {
  try {
    await page.screenshot({ 
      path: `test-results/error-${testName}-${Date.now()}.png`,
      fullPage: true 
    });
  } catch {
    // Ignore les erreurs de capture d'écran
  }
}
