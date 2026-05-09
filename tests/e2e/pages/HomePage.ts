import type { Page } from '@playwright/test';

export class HomePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async reset() {
    await this.page.request.post('/_test/reset');
  }

  async clickNewGroup() {
    await this.page.getByRole('button', { name: 'Nouveau groupe' }).click();
  }

  async openGroup(name: string) {
    await this.page.getByRole('listitem').filter({ hasText: name }).click();
  }

  async isGroupVisible(name: string): Promise<boolean> {
    return this.page.getByRole('listitem').filter({ hasText: name }).isVisible();
  }
}