import { Test } from '@nestjs/testing';
import { appConfig } from './app.config';
import { AppModule } from './app.module';
import { BitwardenService } from './features/bitwarden/bitwarden.service';
import { BackupService } from './features/backup/backup.service';

describe('AppModule lifecycle', () => {
  const originalConfig = { ...appConfig.props };
  const bw = { initAppSession: jest.fn(), closeAppSession: jest.fn() };
  let module: AppModule;

  beforeEach(() => {
    jest.resetAllMocks();
    appConfig.props.nodeEnv = 'production';
    module = new AppModule(bw as unknown as BitwardenService);
  });

  afterEach(() => {
    for (const key of Object.keys(appConfig.props))
      delete (appConfig.props as any)[key];
    Object.assign(appConfig.props, originalConfig);
  });

  it('resolves the real feature dependency graph without starting a CLI session', async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BitwardenService)
      .useValue(bw)
      .compile();
    expect(testingModule.get(BackupService)).toBeInstanceOf(BackupService);
    expect(bw.initAppSession).not.toHaveBeenCalled();
    await testingModule.close();
  });

  it('initializes the vault session on startup', async () => {
    await module.onApplicationBootstrap();
    expect(bw.initAppSession).toHaveBeenCalledTimes(1);
  });

  it('propagates startup failures', async () => {
    bw.initAppSession.mockRejectedValueOnce(new Error('Login failed'));
    await expect(module.onApplicationBootstrap()).rejects.toThrow(
      'Login failed',
    );
  });

  it.each([undefined, 'SIGTERM'])(
    'closes the vault session on shutdown (%s)',
    async (signal) => {
      await module.onApplicationShutdown(signal);
      expect(bw.closeAppSession).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves the session during development restarts', async () => {
    appConfig.props.nodeEnv = 'development';
    await module.onApplicationShutdown('SIGTERM');
    expect(bw.closeAppSession).not.toHaveBeenCalled();
  });

  it('propagates shutdown failures', async () => {
    bw.closeAppSession.mockRejectedValueOnce(new Error('Logout failed'));
    await expect(module.onApplicationShutdown()).rejects.toThrow(
      'Logout failed',
    );
  });
});
