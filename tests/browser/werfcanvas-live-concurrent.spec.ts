import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

const api = process.env.WERFCANVAS_RACE_API_URL;
const secondApi = process.env.WERFCANVAS_RACE_SECOND_API_URL;
const tokens = [process.env.WERFCANVAS_RACE_FIRST_TOKEN, process.env.WERFCANVAS_RACE_SECOND_TOKEN];
const boatId = process.env.WERFCANVAS_RACE_BOAT_ID;
const due = process.env.WERFCANVAS_RACE_DUE_AT;
const canvas = '/api/v1/admin/yard-canvas';
const searchBudget = 10_000;
const saveBudget = 10_000;
const planningBudget = 30_000;

test.use({ trace: 'off' });

test('two live clients race to plan the same placement in a 250-boat yard', async ({ playwright }) => {
  test.skip(!api, 'Set WERFCANVAS_RACE_API_URL to run against an isolated test yard.');
  expect(secondApi, 'configure the second isolated backend; one instance cannot prove cross-instance contention').toBeTruthy();
  expect(new URL(secondApi!).origin, 'cross-instance proof requires two backend origins').not.toBe(new URL(api!).origin);
  expect([boatId, due, ...tokens].every(Boolean), 'configure the fixture boat, yard-local slot and both tokens').toBe(true);
  expect(tokens[0], 'use separate credentials for both clients').not.toBe(tokens[1]);
  expect(due).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

  const clients = await Promise.all([api, secondApi].map((baseURL, index) =>
    playwright.request.newContext({
      baseURL, timeout: 30_000, extraHTTPHeaders: { Accept: 'application/json', Authorization: `Bearer ${tokens[index]}` },
    })));
  const endpoint = `${canvas}/placements/${boatId}`;
  let winner: { index: number; version: number; taskId: string } | undefined;
  const findBoat = async (index = 0) => {
    const response = await clients[index].get(canvas, { params: { placed: 1, search: boatId! }, timeout: searchBudget });
    expect(response.status(), 'search response').toBe(200);
    const { boats } = await response.json();
    return boats.data.find((boat: { id: string }) => boat.id === boatId);
  };

  try {
    const inventory = await clients[0].get(canvas, { params: { placed: 1 } });
    expect(inventory.status()).toBe(200);
    expect((await inventory.json()).boats.total).toBeGreaterThanOrEqual(250);

    const searchStarted = performance.now();
    const boat = await findBoat();
    const searchMs = performance.now() - searchStarted;
    expect(boat, 'fixture boat should be found by ID').toBeDefined();
    const initial = boat.placement;
    expect(initial.actual).toBeTruthy();
    expect(initial.planned, 'fixture must have no pending plan').toBeNull();
    expect(initial.interaction_locked).toBe(false);

    const planningStarted = performance.now();
    const payloads = [-0.1, 0.1].map(offset => ({
      operation: 'plan', version: initial.version, due_at: due!,
      position: { ...initial.actual, x: Math.round((Number(initial.actual.x) + offset) * 10) / 10 },
      idempotency_key: randomUUID(),
    }));
    const saves = await Promise.allSettled(clients.map(async (client, index) => {
      const started = performance.now();
      const response = await client.patch(endpoint, { data: payloads[index], timeout: planningBudget });
      const body = await response.json();
      if (response.status() === 200 && body.planned?.task_id) {
        winner = { index, version: body.version, taskId: body.planned.task_id };
      }
      return { index, status: response.status(), body, elapsedMs: performance.now() - started };
    }));
    const planningMs = performance.now() - planningStarted;
    const results = saves.map(save => {
      if (save.status === 'rejected') throw save.reason;
      return save.value;
    });
    await test.info().attach('werfcanvas-live-concurrent-timings.json', {
      body: JSON.stringify({ backendOrigins: [new URL(api!).origin, new URL(secondApi!).origin],
        crossInstance: new URL(api!).origin !== new URL(secondApi!).origin,
        searchMs, planningMs, saves: results.map(({ status, elapsedMs }) => ({ status, elapsedMs })) }, null, 2),
      contentType: 'application/json',
    });
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    const success = results.find(result => result.status === 200)!;
    const conflict = results.find(result => result.status === 409)!;
    expect(success.body.version).toBe(initial.version + 1);
    expect(success.body.actual).toEqual(initial.actual);
    expect(success.body.planned).toMatchObject(payloads[success.index].position);
    expect(success.body.planned.task_id).toEqual(expect.any(String));
    expect(conflict.body.placement).toMatchObject({
      version: success.body.version, actual: initial.actual, planned: success.body.planned,
      assignment: { task_id: success.body.planned.task_id },
    });
    for (const index of [0, 1]) {
      expect((await findBoat(index)).placement).toMatchObject({
        version: success.body.version, actual: initial.actual, planned: success.body.planned,
      });
    }
    // Retry the winning confirmation through the other backend, retaining the
    // original actor and key. A lost response must not create another task.
    const replay = await clients[success.index].patch(new URL(endpoint, [api!, secondApi!][1 - success.index]).href,
      { data: payloads[success.index] });
    expect(replay.status(), 'cross-backend idempotent replay').toBe(200);
    expect(await replay.json()).toMatchObject({ version: success.body.version, planned: success.body.planned });
    const response = await clients[0].get(`${canvas}/daily-plan`, { params: { date: due!.slice(0, 10) } });
    expect(response.status()).toBe(200);
    const jobs = (await response.json()).jobs.filter((job: { boat_id: string; type: string }) =>
      job.boat_id === boatId && job.type === 'yard_move');
    expect(jobs).toMatchObject([{ id: success.body.planned.task_id, planned: payloads[success.index].position }]);
    expect(searchMs, 'search API latency').toBeLessThan(searchBudget);
    expect(success.elapsedMs, 'concurrent success latency').toBeLessThan(saveBudget);
    expect(conflict.elapsedMs, 'concurrent conflict latency').toBeLessThan(saveBudget);
    expect(planningMs, 'both planning responses').toBeLessThan(planningBudget);
  } finally {
    try {
      if (winner) {
        const current = (await findBoat()).placement;
        if (current.version === winner.version && current.planned?.task_id === winner.taskId) {
          const cleanup = await clients[winner.index].patch(endpoint, {
            data: { operation: 'cancel_plan', version: winner.version },
          });
          expect(cleanup.status(), 'cancel the fixture plan').toBe(200);
          expect((await cleanup.json()).planned).toBeNull();
        }
      }
    } finally {
      await Promise.all(clients.map(client => client.dispose()));
    }
  }
});
