test('session module import does not require SESSION_SECRET', async () => {
  jest.resetModules();
  delete process.env.SESSION_SECRET;

  await expect(import('../src/lib/session')).resolves.toMatchObject({
    SESSION_COOKIE_NAME: 'jbm_session',
  });
});

test('getSessionSecret validates lazily at runtime', async () => {
  jest.resetModules();
  delete process.env.SESSION_SECRET;
  const { getSessionSecret } = await import('../src/lib/session');

  expect(() => getSessionSecret()).toThrow(expect.objectContaining({
    code: 'SESSION_CONFIGURATION_ERROR',
  }));
});
