import { exec, execFile } from 'child_process';
import { appConfig } from '../../app.config';
import { BitwardenService } from './bitwarden.service';

jest.mock('child_process', () => {
  const execute = jest.fn();
  Object.defineProperty(
    execute,
    jest.requireActual<typeof import('util')>('util').promisify.custom,
    {
      value: execute,
      configurable: true,
    },
  );
  const executeFile = jest.fn();
  Object.defineProperty(
    executeFile,
    jest.requireActual<typeof import('util')>('util').promisify.custom,
    { value: executeFile, configurable: true },
  );
  return { exec: execute, execFile: executeFile };
});

const execute = exec as unknown as jest.Mock;
const executeFile = execFile as unknown as jest.Mock;

describe('BitwardenService', () => {
  const originalConfig = { ...appConfig.props };
  let originalEnv: NodeJS.ProcessEnv;
  let service: BitwardenService;
  const serverUrl = 'https://vault.example.test';

  beforeEach(() => {
    originalEnv = { ...process.env };
    execute.mockReset().mockResolvedValue({ stdout: '', stderr: '' });
    executeFile.mockReset().mockResolvedValue({ stdout: '', stderr: '' });
    Object.assign(appConfig.props, {
      bwServerUrl: serverUrl,
      bwSafePassword: 'test-password',
      bwClientId: 'test-client',
      bwClientSecret: 'test-secret',
    });
    service = new BitwardenService();
  });

  afterEach(() => {
    process.env = originalEnv;
    for (const key of Object.keys(appConfig.props))
      delete (appConfig.props as any)[key];
    Object.assign(appConfig.props, originalConfig);
  });

  it.each([
    [
      'unauthenticated',
      ['bw login --apikey', 'bw unlock --raw --passwordenv BW_SAFE_PASSWORD'],
    ],
    ['locked', ['bw unlock --raw --passwordenv BW_SAFE_PASSWORD']],
    ['unlocked', []],
  ])(
    'initializes a %s session with only the required commands',
    async (status, commands) => {
      execute.mockResolvedValueOnce({
        stdout: JSON.stringify({ serverUrl, status }),
      });
      await service.initAppSession();
      expect(execute.mock.calls.map(([command]) => command)).toEqual([
        'bw status',
        ...commands,
      ]);
    },
  );

  it('configures a different server before logging in', async () => {
    execute.mockResolvedValueOnce({
      stdout: JSON.stringify({ serverUrl: null, status: 'unauthenticated' }),
    });
    await service.initAppSession();
    expect(execute.mock.calls.map(([command]) => command)).toEqual([
      'bw status',
      `bw config server ${serverUrl}`,
      'bw login --apikey',
      'bw unlock --raw --passwordenv BW_SAFE_PASSWORD',
    ]);
  });

  it.each([
    ['unlocked', ['bw lock', 'bw logout']],
    ['locked', ['bw logout']],
    ['unauthenticated', []],
  ])(
    'closes a %s session with only the required commands',
    async (status, commands) => {
      execute.mockResolvedValueOnce({ stdout: JSON.stringify({ status }) });
      await service.closeAppSession();
      expect(execute.mock.calls.map(([command]) => command)).toEqual([
        'bw status',
        ...commands,
      ]);
    },
  );

  it('passes configured API credentials to the CLI environment', async () => {
    await service.login();
    expect(process.env.BW_CLIENTID).toBe('test-client');
    expect(process.env.BW_CLIENTSECRET).toBe('test-secret');
    expect(execute).toHaveBeenCalledWith('bw login --apikey');
  });

  it('stores and returns the unlocked session token', async () => {
    execute.mockResolvedValueOnce({ stdout: 'test-session' });
    await expect(service.unlock()).resolves.toBe('test-session');
    expect(process.env.BW_SESSION).toBe('test-session');
    expect(process.env.BW_SAFE_PASSWORD).toBe('test-password');
  });

  it('rejects malformed CLI status output', async () => {
    execute.mockResolvedValueOnce({ stdout: 'invalid-json' });
    await expect(service.getStatus()).rejects.toBeInstanceOf(SyntaxError);
  });

  it('stops initialization if login fails', async () => {
    execute.mockResolvedValueOnce({
      stdout: JSON.stringify({ serverUrl, status: 'unauthenticated' }),
    });
    execute.mockRejectedValueOnce(new Error('Login failed'));
    await expect(service.initAppSession()).rejects.toThrow('Login failed');
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('exports encrypted JSON to stdout by default', async () => {
    executeFile.mockResolvedValueOnce({ stdout: 'encrypted-data' });
    await expect(service.export()).resolves.toBe('encrypted-data');
    expect(executeFile).toHaveBeenCalledWith('bw', [
      'export',
      '--format',
      'encrypted_json',
      '--password',
      'test-password',
      '--raw',
    ]);
  });

  it.each(['json', 'csv'] as const)(
    'exports %s without an encryption password',
    async (format) => {
      await service.export({ format });
      expect(executeFile).toHaveBeenCalledWith('bw', [
        'export',
        '--format',
        format,
        '--raw',
      ]);
    },
  );

  it('prefers an explicit output path over raw output and accepts a password override', async () => {
    await service.export({
      output: '/test-data/backup.json',
      password: 'override',
    });
    expect(executeFile).toHaveBeenCalledWith('bw', [
      'export',
      '--format',
      'encrypted_json',
      '--password',
      'override',
      '--output',
      '/test-data/backup.json',
    ]);
  });

  it('rejects file exports without a destination before invoking the CLI', async () => {
    await expect(service.export({ raw: false })).rejects.toThrow(
      'options.output',
    );
    expect(executeFile).not.toHaveBeenCalled();
  });

  it('propagates export failures', async () => {
    executeFile.mockRejectedValueOnce(new Error('Export failed'));
    await expect(service.export()).rejects.toThrow('Bitwarden export failed');
  });
  it('passes organization IDs, passwords and paths as literal arguments', async () => {
    await service.export({
      organizationId: 'org-id',
      password: 'a $(secret); \" b',
      output: '/tmp/path with spaces.json',
    });
    expect(executeFile).toHaveBeenCalledWith('bw', [
      'export',
      '--format',
      'encrypted_json',
      '--password',
      'a $(secret); \" b',
      '--organizationid',
      'org-id',
      '--output',
      '/tmp/path with spaces.json',
    ]);
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not expose sensitive command details on export failure', async () => {
    executeFile.mockRejectedValue(
      new Error('bw export --password test-password'),
    );
    await expect(service.export()).rejects.toThrow(/^Bitwarden export failed$/);
  });

  it('rejects an empty organization ID instead of exporting the personal vault', async () => {
    await expect(service.export({ organizationId: '' })).rejects.toThrow(
      'Organization ID',
    );
    expect(executeFile).not.toHaveBeenCalled();
  });
});
