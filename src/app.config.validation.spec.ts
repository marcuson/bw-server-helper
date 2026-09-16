import { appConfig } from './app.config';
import { envCfg } from './config/env-config';

describe('AppConfig validation', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const originalConfig = { ...appConfig.props };

  beforeEach(() => {
    originalEnv = { ...process.env };
    for (const key of Object.keys(envCfg)) delete process.env[key];
    Object.assign(process.env, {
      BW_CLIENTID: 'test-client',
      BW_CLIENTSECRET: 'test-secret',
      BW_SAFE_PASSWORD: 'test-password',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    for (const key of Object.keys(appConfig.props))
      delete (appConfig.props as any)[key];
    Object.assign(appConfig.props, originalConfig);
  });

  it('applies defaults when only required credentials are supplied', () => {
    appConfig.actualizeFromEnv();
    expect(appConfig.props).toMatchObject({
      port: 3000,
      apiEnabled: true,
      scheduleEnabled: false,
      swaggerEnabled: false,
      backupMaxNum: 30,
      dataDir: '/bwsh/data',
      bwServerUrl: 'https://bitwarden.com',
      scheduleBackupCron: '0 0 * * *',
      nodeEnv: 'production',
    });
  });

  it('converts numeric and boolean environment values', () => {
    Object.assign(process.env, {
      PORT: '4321',
      BACKUP_MAX_NUM: '7',
      API_ENABLED: 'false',
      SCHEDULE_ENABLED: 'true',
    });
    appConfig.actualizeFromEnv();
    expect(appConfig.props).toMatchObject({
      port: 4321,
      backupMaxNum: 7,
      apiEnabled: false,
      scheduleEnabled: true,
    });
  });

  it('treats empty optional values as missing and reapplies defaults', () => {
    process.env.PORT = '';
    process.env.SCHEDULE_BACKUP_CRON = '';
    appConfig.actualizeFromEnv();
    expect(appConfig.props.port).toBe(3000);
    expect(appConfig.props.scheduleBackupCron).toBe('0 0 * * *');
  });

  it.each(['BW_CLIENTID', 'BW_CLIENTSECRET', 'BW_SAFE_PASSWORD'])(
    'requires %s',
    (key) => {
      delete process.env[key];
      expect(() => appConfig.actualizeFromEnv()).toThrow(key);
    },
  );

  it.each([
    ['PORT', 'not-a-number'],
    ['API_ENABLED', 'not-a-boolean'],
    ['IP_BIND', 'invalid-ip'],
    ['SCHEDULE_BACKUP_HEALTHCHECKS_URL', 'invalid-url'],
  ])('rejects invalid %s values', (key, value) => {
    process.env[key] = value;
    expect(() => appConfig.actualizeFromEnv()).toThrow(key);
  });

  it('reports multiple errors without partially updating configuration', () => {
    appConfig.actualizeFromEnv();
    const validConfig = { ...appConfig.props };
    process.env.PORT = 'invalid';
    delete process.env.BW_CLIENTID;
    let message = '';
    try {
      appConfig.actualizeFromEnv();
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('PORT');
    expect(message).toContain('BW_CLIENTID');
    expect(appConfig.props).toEqual(validConfig);
  });
});
