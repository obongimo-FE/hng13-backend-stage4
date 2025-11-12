import { test } from 'tap';
import { fastify } from '../../src/app.js';

test('Health check endpoint', async (t) => {
  const app = fastify();
  
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  });

  t.equal(response.statusCode, 200);
  
  const body = JSON.parse(response.body);
  t.equal(body.success, true);
  t.equal(body.data.status, 'healthy');
});