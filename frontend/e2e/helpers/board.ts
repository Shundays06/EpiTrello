import { Page } from '@playwright/test';

/**
 * Helper pour créer un board de test
 */
export async function createBoard(page: Page, boardName: string, description: string = '') {
  // Cliquer sur "Nouveau board"
  await page.getByRole('button', { name: 'Nouveau board' }).click();
  
  // Attendre le modal de création de board
  await page.waitForSelector('[data-testid="create-board-modal"]', { state: 'visible' });
  
  // Remplir les champs
  await page.fill('[data-testid="board-name"]', boardName);
  if (description) {
    await page.fill('[data-testid="board-description"]', description);
  }
  
  // Cliquer sur créer
  await page.getByRole('button', { name: 'Créer le board' }).click();
  
  // Attendre que le modal se ferme
  await page.waitForSelector('[data-testid="create-board-modal"]', { state: 'hidden' });
  
  // Attendre que le board soit sélectionné
  await page.waitForSelector(`text=${boardName}`, { timeout: 5000 });
}

/**
 * Helper pour sélectionner un board
 */
export async function selectBoard(page: Page, boardName: string) {
  // Ouvrir la liste des boards
  await page.click('[data-testid="board-selector"]');
  
  // Sélectionner le board
  await page.click(`text=${boardName}`);
  
  // Attendre que le board soit chargé
  await page.waitForTimeout(1000);
}

/**
 * Helper pour inviter un utilisateur à un board
 */
export async function inviteUserToBoard(page: Page, userEmail: string) {
  // Cliquer sur le bouton Inviter
  await page.getByRole('button', { name: 'Inviter' }).click();
  
  // Attendre le modal d'invitation
  await page.waitForSelector('[data-testid="invite-user-modal"]', { state: 'visible' });
  
  // Remplir l'email
  await page.fill('[data-testid="invite-email"]', userEmail);
  
  // Envoyer l'invitation
  await page.getByRole('button', { name: 'Envoyer l\'invitation' }).click();
  
  // Attendre que le modal se ferme ou qu'un message de succès apparaisse
  await page.waitForSelector('[data-testid="invite-user-modal"]', { state: 'hidden' });
}

/**
 * Helper pour créer une colonne
 */
export async function createColumn(page: Page, columnName: string) {
  // Cliquer sur le bouton Colonne
  await page.getByRole('button', { name: 'Colonne' }).click();
  
  // Attendre le modal de création de colonne
  await page.waitForSelector('[data-testid="create-column-modal"]', { state: 'visible' });
  
  // Remplir le nom de la colonne
  await page.fill('[data-testid="column-name"]', columnName);
  
  // Créer la colonne
  await page.getByRole('button', { name: 'Créer la colonne' }).click();
  
  // Attendre que le modal se ferme
  await page.waitForSelector('[data-testid="create-column-modal"]', { state: 'hidden' });
  
  // Vérifier que la colonne est créée
  await page.waitForSelector(`text=${columnName}`, { timeout: 5000 });
}

/**
 * Helper pour créer une carte
 */
export async function createCard(page: Page, title: string, description: string = '', columnName: string = 'À faire') {
  // Cliquer sur le bouton Carte
  await page.getByRole('button', { name: 'Carte' }).click();
  
  // Attendre le modal de création de carte
  await page.waitForSelector('[data-testid="create-card-modal"]', { state: 'visible' });
  
  // Remplir les champs
  await page.fill('[data-testid="card-title"]', title);
  if (description) {
    await page.fill('[data-testid="card-description"]', description);
  }
  
  // Sélectionner la colonne si spécifiée
  if (columnName !== 'À faire') {
    await page.selectOption('[data-testid="card-column"]', { label: columnName });
  }
  
  // Créer la carte
  await page.getByRole('button', { name: 'Créer la carte' }).click();
  
  // Attendre que le modal se ferme
  await page.waitForSelector('[data-testid="create-card-modal"]', { state: 'hidden' });
  
  // Vérifier que la carte est créée
  await page.waitForSelector(`text=${title}`, { timeout: 5000 });
}

/**
 * Helper pour déplacer une carte (drag & drop)
 */
export async function moveCard(page: Page, cardTitle: string, targetColumnName: string) {
  // Localiser la carte
  const card = page.locator(`[data-testid="card"]`, { hasText: cardTitle });
  
  // Localiser la colonne cible
  const targetColumn = page.locator(`[data-testid="column"]`, { hasText: targetColumnName });
  
  // Effectuer le drag & drop
  await card.dragTo(targetColumn);
  
  // Attendre que le mouvement soit effectué
  await page.waitForTimeout(1000);
}
