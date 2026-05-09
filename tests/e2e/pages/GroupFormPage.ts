import type { Page } from '@playwright/test';

export class GroupFormPage {
  constructor(private readonly page: Page) {}

  async fillName(name: string) {
    await this.page.getByLabel('Nom du groupe').fill(name);
  }

  async fillMembers(members: Array<{ name: string; email: string }>) {
    const text = members.map(m => `${m.name} <${m.email}>`).join('\n');
    await this.page.getByLabel(/Membres/).fill(text);
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Créer' }).click();
  }
}