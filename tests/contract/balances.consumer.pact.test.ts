import { describe, it, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { like, eachLike } = MatchersV3;
const __dirname = dirname(fileURLToPath(import.meta.url));

const provider = new PactV3({
  consumer: 'splitto-frontend',
  provider: 'splitto-api',
  dir: join(__dirname, '../../pacts'),
  logLevel: 'warn',
});

async function fetchBalances(groupId: string, baseUrl: string) {
  const res = await fetch(`${baseUrl}/api/groups/${groupId}/balances`);
  return { status: res.status, body: res.ok ? await res.json() : null };
}

describe('splitto-frontend — consumer pact', () => {

  it('GET /api/groups/group-1/balances → 200 avec balances', async () => {
    await provider
      .addInteraction({
        states: [{ description: 'group-1 a 3 membres et 2 dépenses' }],
        uponReceiving: 'une requête de balances pour un groupe existant',
        withRequest: {
          method: 'GET',
          path: '/api/groups/group-1/balances',
        },
        willRespondWith: {
          status: 200,
          body: {
            groupId: like('group-1'),
            balances: like({ 'member-alice': like(20.0) }),
            settlements: eachLike({
              from: like('member-bob'),
              to: like('member-alice'),
              amount: like(10.0),
            }),
          },
        },
      })
      .executeTest(async (mockServer) => {
        const result = await fetchBalances('group-1', mockServer.url);
        expect(result.status).toBe(200);
        expect(result.body).toHaveProperty('groupId');
        expect(result.body).toHaveProperty('balances');
        expect(result.body).toHaveProperty('settlements');
      });
  });

  it('GET /api/groups/inexistant/balances → 404', async () => {
    await provider
      .addInteraction({
        states: [{ description: 'aucun groupe inexistant' }],
        uponReceiving: 'une requête de balances pour un groupe inexistant',
        withRequest: {
          method: 'GET',
          path: '/api/groups/inexistant/balances',
        },
        willRespondWith: {
          status: 404,
          body: { error: like('Group not found') },
        },
      })
      .executeTest(async (mockServer) => {
        const result = await fetchBalances('inexistant', mockServer.url);
        expect(result.status).toBe(404);
      });
  });
});