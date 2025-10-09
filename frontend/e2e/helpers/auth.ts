import { Page } from '@playwright/test';

export interface User {
  username: string;
  email: string;
  password: string;
}

export const testUsers = {
  admin: {
    username: 'admin',
    email: 'admin@epitrello.com',
    password: 'admin123'
  },
  member: {
    username: 'member',
    email: 'member@epitrello.com', 
    password: 'member123'
  },
  collaborator: {
    username: 'collaborator',
    email: 'collaborator@epitrello.com',
    password: 'collab123'
  }
};

/**
 * Helper pour se connecter avec un utilisateur
 */
export async function loginAs(page: Page, user: User) {
  // Cliquer sur le bouton Se connecter
  await page.getByRole('button', { name: 'Se connecter' }).click();
  
  // Attendre que le modal de connexion soit visible
  await page.waitForSelector('[data-testid="login-modal"]', { state: 'visible' });
  
  // Remplir les champs
  await page.fill('[data-testid="login-email"]', user.email);
  await page.fill('[data-testid="login-password"]', user.password);
  
  // Cliquer sur connexion
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  
  // Attendre que la connexion soit effective (disparition du modal)
  await page.waitForSelector('[data-testid="login-modal"]', { state: 'hidden' });
  
  // Vérifier que l'utilisateur est connecté (présence du profil)
  await page.waitForSelector(`text=${user.username}`, { timeout: 5000 });
}

/**
 * Helper pour se déconnecter
 */
export async function logout(page: Page) {
  // Cliquer sur le profil utilisateur
  await page.click('[data-testid="user-profile-button"]');
  
  // Attendre le modal de profil
  await page.waitForSelector('[data-testid="profile-modal"]');
  
  // Cliquer sur déconnexion
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  
  // Vérifier que l'utilisateur est déconnecté
  await page.waitForSelector('text=Se connecter', { timeout: 5000 });
}

/**
 * Helper pour créer un utilisateur de test
 */
export async function createUser(page: Page, user: User) {
  // Cliquer sur S'inscrire
  await page.getByRole('button', { name: 'S\'inscrire' }).click();
  
  // Attendre le modal d'inscription
  await page.waitForSelector('[data-testid="register-modal"]', { state: 'visible' });
  
  // Remplir les champs
  await page.fill('[data-testid="register-username"]', user.username);
  await page.fill('[data-testid="register-email"]', user.email);
  await page.fill('[data-testid="register-password"]', user.password);
  
  // Cliquer sur s'inscrire
  await page.getByRole('button', { name: 'S\'inscrire' }).last().click();
  
  // Attendre que l'inscription soit effective
  await page.waitForSelector('[data-testid="register-modal"]', { state: 'hidden' });
}
