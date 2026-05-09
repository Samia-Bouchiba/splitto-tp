import type { Page } from '@playwright/test';

export class GroupPage {
  constructor(private readonly page: Page) {}

  async clickAddExpense() {
    await this.page.getByRole('button', { name: 'Ajouter une dépense' }).click();
  }

  async fillExpenseDescription(description: string) {
    await this.page.getByLabel('Description').fill(description);
  }

  async fillExpenseAmount(amount: number) {
    await this.page.getByLabel('Montant').fill(String(amount));
  }

  async selectPaidBy(memberName: string) {
    await this.page.getByLabel('Payé par').selectOption({ label: memberName });
  }

  async submitExpense() {
  await this.page.getByRole('button', { name: 'Ajouter', exact: true }).click();
}

  async getMemberBalanceRow(memberName: string) {
    return this.page
      .getByRole('table', { name: 'Soldes des membres' })
      .getByRole('row')
      .filter({ hasText: memberName });
  }

  async clickSettle(index: number) {
    await this.page
      .getByTestId(`settlement-row-${index}`)
      .getByRole('button', { name: 'Régler' })
      .click();
  }
}