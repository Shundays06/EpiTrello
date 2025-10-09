import { test, expect } from '@playwright/test';
import { loginAs, logout, testUsers, createUser } from './helpers/auth';
import { createBoard, inviteUserToBoard, createColumn, createCard, moveCard, selectBoard } from './helpers/board';
import { openInvitations, acceptInvitation, hasInvitation, closeInvitations } from './helpers/invitations';

test.describe('Workflow de Collaboration EpiTrello', () => {
  
  test.beforeEach(async ({ page }) => {
    // Aller à la page d'accueil
    await page.goto('/');
    
    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle');
  });

  test('Scénario complet de collaboration - Invitation et travail en équipe', async ({ page, context }) => {
    // === PHASE 1: L'admin crée un projet et invite un collaborateur ===
    
    // 1. Créer et connecter l'utilisateur admin
    await createUser(page, testUsers.admin);
    await expect(page.locator(`text=${testUsers.admin.username}`)).toBeVisible();
    
    // 2. Créer un nouveau board de projet
    const projectName = 'Projet Collaboration Test';
    await createBoard(page, projectName, 'Board de test pour la collaboration');
    
    // 3. Créer les colonnes de base pour le workflow
    await createColumn(page, 'À faire');
    await createColumn(page, 'En cours');
    await createColumn(page, 'Terminé');
    
    // 4. Créer quelques tâches initiales
    await createCard(page, 'Tâche 1: Setup projet', 'Configuration initiale du projet', 'À faire');
    await createCard(page, 'Tâche 2: Développement feature A', 'Développer la fonctionnalité A', 'À faire');
    
    // 5. Inviter un collaborateur au projet
    await inviteUserToBoard(page, testUsers.collaborator.email);
    
    // Vérifier que l'invitation a été envoyée avec succès
    await expect(page.locator('text=Invitation créée avec succès')).toBeVisible({ timeout: 5000 });
    
    // Se déconnecter en tant qu'admin
    await logout(page);
    
    // === PHASE 2: Le collaborateur rejoint le projet ===
    
    // 6. Créer et connecter le collaborateur
    await createUser(page, testUsers.collaborator);
    await expect(page.locator(`text=${testUsers.collaborator.username}`)).toBeVisible();
    
    // 7. Vérifier et accepter l'invitation
    await openInvitations(page);
    
    // Vérifier que l'invitation est présente
    const hasProjectInvitation = await hasInvitation(page, projectName);
    expect(hasProjectInvitation).toBe(true);
    
    // Accepter l'invitation
    await acceptInvitation(page, projectName);
    await closeInvitations(page);
    
    // 8. Vérifier que le collaborateur a maintenant accès au board
    await selectBoard(page, projectName);
    
    // Vérifier que les tâches créées par l'admin sont visibles
    await expect(page.locator('text=Tâche 1: Setup projet')).toBeVisible();
    await expect(page.locator('text=Tâche 2: Développement feature A')).toBeVisible();
    
    // === PHASE 3: Collaboration active ===
    
    // 9. Le collaborateur prend en charge une tâche
    await moveCard(page, 'Tâche 1: Setup projet', 'En cours');
    
    // 10. Le collaborateur ajoute une nouvelle tâche
    await createCard(page, 'Tâche 3: Tests unitaires', 'Créer les tests pour la feature A', 'À faire');
    
    // 11. Le collaborateur termine sa première tâche
    await moveCard(page, 'Tâche 1: Setup projet', 'Terminé');
    
    // Se déconnecter en tant que collaborateur
    await logout(page);
    
    // === PHASE 4: L'admin vérifie les modifications ===
    
    // 12. L'admin se reconnecte
    await loginAs(page, testUsers.admin);
    
    // 13. Sélectionner le board du projet
    await selectBoard(page, projectName);
    
    // 14. Vérifier que les modifications du collaborateur sont visibles
    await expect(page.locator('text=Tâche 3: Tests unitaires')).toBeVisible();
    
    // Vérifier que la Tâche 1 est dans "Terminé"
    const terminedColumn = page.locator('[data-testid="column"]', { hasText: 'Terminé' });
    await expect(terminedColumn.locator('text=Tâche 1: Setup projet')).toBeVisible();
    
    // 15. L'admin déplace une autre tâche vers "En cours"
    await moveCard(page, 'Tâche 2: Développement feature A', 'En cours');
    
    // === PHASE 5: Test avec un deuxième collaborateur ===
    
    // 16. Inviter un membre supplémentaire
    await inviteUserToBoard(page, testUsers.member.email);
    await expect(page.locator('text=Invitation créée avec succès')).toBeVisible();
    
    await logout(page);
    
    // 17. Le nouveau membre rejoint
    await createUser(page, testUsers.member);
    await openInvitations(page);
    await acceptInvitation(page, projectName);
    await closeInvitations(page);
    
    // 18. Vérifier que le nouveau membre voit toutes les modifications
    await selectBoard(page, projectName);
    await expect(page.locator('text=Tâche 3: Tests unitaires')).toBeVisible();
    
    // Le membre ajoute une tâche de documentation
    await createCard(page, 'Tâche 4: Documentation', 'Rédiger la documentation du projet', 'À faire');
    
    // === VÉRIFICATIONS FINALES ===
    
    // 19. Vérifier l'état final du board
    await expect(page.locator('text=Tâche 4: Documentation')).toBeVisible();
    
    // Vérifier que nous avons 4 tâches au total
    const allCards = page.locator('[data-testid="card"]');
    await expect(allCards).toHaveCount(4);
    
    // Vérifier la répartition dans les colonnes
    const todoColumn = page.locator('[data-testid="column"]', { hasText: 'À faire' });
    const inProgressColumn = page.locator('[data-testid="column"]', { hasText: 'En cours' });
    const doneColumn = page.locator('[data-testid="column"]', { hasText: 'Terminé' });
    
    await expect(todoColumn.locator('[data-testid="card"]')).toHaveCount(2); // Tâche 3 et 4
    await expect(inProgressColumn.locator('[data-testid="card"]')).toHaveCount(1); // Tâche 2
    await expect(doneColumn.locator('[data-testid="card"]')).toHaveCount(1); // Tâche 1
  });

  test('Test de refus d\'invitation', async ({ page }) => {
    // 1. Admin crée un board et invite quelqu'un
    await createUser(page, testUsers.admin);
    await createBoard(page, 'Board Test Refus', 'Test du refus d\'invitation');
    await inviteUserToBoard(page, testUsers.collaborator.email);
    await logout(page);
    
    // 2. Le collaborateur refuse l'invitation
    await createUser(page, testUsers.collaborator);
    await openInvitations(page);
    
    const hasInvite = await hasInvitation(page, 'Board Test Refus');
    expect(hasInvite).toBe(true);
    
    // Décliner l'invitation
    const invitationCard = page.locator('[data-testid="invitation-card"]', { hasText: 'Board Test Refus' });
    await invitationCard.getByRole('button', { name: 'Décliner' }).click();
    
    await closeInvitations(page);
    
    // 3. Vérifier que le collaborateur n'a pas accès au board
    // Le board ne devrait pas apparaître dans la liste des boards accessibles
    const boardSelector = page.locator('[data-testid="board-selector"]');
    await expect(boardSelector).not.toContainText('Board Test Refus');
  });

  test('Test de gestion des permissions - Seuls les membres peuvent voir le contenu', async ({ page }) => {
    // 1. Admin crée un board privé
    await createUser(page, testUsers.admin);
    await createBoard(page, 'Board Privé', 'Board accessible seulement aux membres');
    await createCard(page, 'Contenu privé', 'Cette carte ne devrait être visible que par les membres');
    await logout(page);
    
    // 2. Un utilisateur non invité ne devrait pas voir le board
    await createUser(page, testUsers.member);
    
    // Vérifier que le board privé n'apparaît pas dans la liste
    const boardSelector = page.locator('[data-testid="board-selector"]');
    await expect(boardSelector).not.toContainText('Board Privé');
    
    // 3. Maintenant inviter cet utilisateur
    await logout(page);
    await loginAs(page, testUsers.admin);
    await selectBoard(page, 'Board Privé');
    await inviteUserToBoard(page, testUsers.member.email);
    await logout(page);
    
    // 4. L'utilisateur invité accepte et peut maintenant voir le contenu
    await loginAs(page, testUsers.member);
    await openInvitations(page);
    await acceptInvitation(page, 'Board Privé');
    await closeInvitations(page);
    
    // Maintenant le board devrait être accessible
    await selectBoard(page, 'Board Privé');
    await expect(page.locator('text=Contenu privé')).toBeVisible();
  });
});
