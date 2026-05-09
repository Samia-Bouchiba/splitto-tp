import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { GroupFormPage } from './pages/GroupFormPage';
import { GroupPage } from './pages/GroupPage';

test.beforeEach(async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.reset();
  await page.reload();
});

// Scénario 1 : Créer un groupe avec 3 membres 
test('1. créer un groupe avec 3 membres', async ({ page }) => {
  const home = new HomePage(page);
  const form = new GroupFormPage(page);

  await home.clickNewGroup();
  await form.fillName('Vacances Portugal');
  await form.fillMembers([
    { name: 'Alice', email: 'alice@test.com' },
    { name: 'Bob', email: 'bob@test.com' },
    { name: 'Charlie', email: 'charlie@test.com' },
  ]);
  await form.submit();

  await expect(
    page.getByRole('listitem').filter({ hasText: 'Vacances Portugal' })
  ).toBeVisible();
});

// Scénario 2 : Ajouter une dépense 
test('2. ajouter une dépense dans un groupe', async ({ page }) => {
  const home = new HomePage(page);
  const form = new GroupFormPage(page);
  const groupPage = new GroupPage(page);

  // Créer un groupe
  await home.clickNewGroup();
  await form.fillName('Soirée');
  await form.fillMembers([
    { name: 'Alice', email: 'alice@test.com' },
    { name: 'Bob', email: 'bob@test.com' },
  ]);
  await form.submit();

  await home.openGroup('Soirée');

  await groupPage.clickAddExpense();
  await groupPage.fillExpenseDescription('Pizza');
  await groupPage.fillExpenseAmount(24);
  await groupPage.submitExpense();

  await expect(
    page.getByRole('table', { name: 'Liste des dépenses' })
      .getByRole('cell', { name: 'Pizza' })
  ).toBeVisible();
});

test('3. soldes corrects après 30€ payés par Alice pour 3 personnes', async ({ page }) => {
  const home = new HomePage(page);
  const form = new GroupFormPage(page);
  const groupPage = new GroupPage(page);


  await home.clickNewGroup();
  await form.fillName('Weekend');
  await form.fillMembers([
    { name: 'Alice', email: 'alice@test.com' },
    { name: 'Bob', email: 'bob@test.com' },
    { name: 'Charlie', email: 'charlie@test.com' },
  ]);
  await form.submit();
  await home.openGroup('Weekend');

 
  await groupPage.clickAddExpense();
  await groupPage.fillExpenseDescription('Auberge');
  await groupPage.fillExpenseAmount(30);
  await groupPage.selectPaidBy('Alice');
  await groupPage.submitExpense();

 
  const aliceRow = await groupPage.getMemberBalanceRow('Alice');
  await expect(aliceRow).toContainText('20.00');

  const bobRow = await groupPage.getMemberBalanceRow('Bob');
  await expect(bobRow).toContainText('-10.00');

  const charlieRow = await groupPage.getMemberBalanceRow('Charlie');
  await expect(charlieRow).toContainText('-10.00');
});


test('4. marquer un règlement comme réglé le retire de la liste', async ({ page }) => {
  const home = new HomePage(page);
  const form = new GroupFormPage(page);
  const groupPage = new GroupPage(page);


  await home.clickNewGroup();
  await form.fillName('Coloc');
  await form.fillMembers([
    { name: 'Alice', email: 'alice@test.com' },
    { name: 'Bob', email: 'bob@test.com' },
  ]);
  await form.submit();
  await home.openGroup('Coloc');

  await groupPage.clickAddExpense();
  await groupPage.fillExpenseDescription('Loyer');
  await groupPage.fillExpenseAmount(100);
  await groupPage.selectPaidBy('Alice');
  await groupPage.submitExpense();


  await groupPage.clickSettle(0);


  await expect(page.getByTestId('settlement-row-0')).not.toBeVisible();

  await expect(page.getByRole('alert')).toContainText('effectué');
});