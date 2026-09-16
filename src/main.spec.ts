describe('Main entrypoint', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.dontMock('./app.config');
    jest.dontMock('./app.bootstrap');
  });

  it.each([undefined, 'Europe/Rome'])(
    'loads configuration before importing the application and respects TZ=%s',
    (timezone) => {
      if (timezone) process.env.TZ = timezone;
      else delete process.env.TZ;
      const events: string[] = [];
      const loadEnvFiles = jest.fn(() => events.push('load'));
      jest.doMock('./app.config', () => ({
        appConfig: {
          loadEnvFiles,
          actualizeFromEnv: () => events.push('validate'),
        },
      }));
      jest.doMock('./app.bootstrap', () => {
        events.push('import');
        return { bootstrap: () => events.push('bootstrap') };
      });
      jest.isolateModules(() => {
        jest.requireActual('./main');
      });
      expect(loadEnvFiles).toHaveBeenCalledWith(['.env']);
      expect(events).toEqual(['load', 'validate', 'import', 'bootstrap']);
      expect(process.env.TZ).toBe(timezone || 'Etc/UTC');
    },
  );

  it('does not start the application when configuration is invalid', () => {
    const bootstrap = jest.fn();
    jest.doMock('./app.config', () => ({
      appConfig: {
        loadEnvFiles: jest.fn(),
        actualizeFromEnv: () => {
          throw new Error('Invalid configuration');
        },
      },
    }));
    jest.doMock('./app.bootstrap', () => ({ bootstrap }));
    expect(() =>
      jest.isolateModules(() => {
        jest.requireActual('./main');
      }),
    ).toThrow('Invalid configuration');
    expect(bootstrap).not.toHaveBeenCalled();
  });
});
