import { Page } from '@playwright/test';

/**
 * Helper pour ouvrir les invitations
 */
export async function openInvitations(page: Page) {
  // Cliquer sur les invitations dans le menu ou profil
  await page.getByRole('button', { name: 'Invitations' }).click();
  
  // Attendre que le modal des invitations soit visible
  await page.waitForSelector('[data-testid="invitations-modal"]', { state: 'visible' });
}

/**
 * Helper pour accepter une invitation
 */
export async function acceptInvitation(page: Page, boardName: string) {
  // Localiser l'invitation pour le board spécifique
  const invitationCard = page.locator('[data-testid="invitation-card"]', { hasText: boardName });
  
  // Cliquer sur accepter
  await invitationCard.getByRole('button', { name: 'Accepter' }).click();
  
  // Attendre que l'invitation soit traitée
  await page.waitForTimeout(2000);
}

/**
 * Helper pour décliner une invitation
 */
export async function declineInvitation(page: Page, boardName: string) {
  // Localiser l'invitation pour le board spécifique
  const invitationCard = page.locator('[data-testid="invitation-card"]', { hasText: boardName });
  
  // Cliquer sur décliner
  await invitationCard.getByRole('button', { name: 'Décliner' }).click();
  
  // Attendre que l'invitation soit traitée
  await page.waitForTimeout(2000);
}

/**
 * Helper pour vérifier qu'une invitation est présente
 */
export async function hasInvitation(page: Page, boardName: string): Promise<boolean> {
  try {
    const invitationCard = page.locator('[data-testid="invitation-card"]', { hasText: boardName });
    await invitationCard.waitFor({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper pour fermer le modal des invitations
 */
export async function closeInvitations(page: Page) {
  // Cliquer sur fermer ou échap
  await page.keyboard.press('Escape');
  
  // Attendre que le modal se ferme
  await page.waitForSelector('[data-testid="invitations-modal"]', { state: 'hidden' });
}
