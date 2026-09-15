import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { appConfig } from '../../app.config';
import { BitwardenService } from '../bitwarden/bitwarden.service';
import { BackupService } from './backup.service';

jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
}));

const readDirMock = jest.mocked(readdir);
const statMock = jest.mocked(stat);
const unlinkMock = jest.mocked(unlink);

describe('BackupService', () => {
  const originalConfig = { ...appConfig.props };
  const exportMock = jest.fn();
  let service: BackupService;

  beforeEach(() => {
    jest.resetAllMocks();
    Object.assign(appConfig.props, {
      dataDir: '/test-data',
      backupMaxNum: 2,
      bwSafePassword: 'test-password',
    });
    service = new BackupService({
      export: exportMock,
    } as unknown as BitwardenService);
    readDirMock.mockResolvedValue([]);
    exportMock.mockResolvedValue('');
  });

  afterEach(() => {
    jest.useRealTimers();
    for (const key of Object.keys(appConfig.props)) {
      delete (appConfig.props as any)[key];
    }
    Object.assign(appConfig.props, originalConfig);
  });

  it('exports an encrypted backup with a deterministic local timestamp before pruning', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 2, 3, 4, 5));
    await expect(service.backup()).resolves.toEqual({
      filename: '20260102-030405.json',
    });
    expect(exportMock).toHaveBeenCalledWith({
      password: 'test-password',
      raw: false,
      format: 'encrypted_json',
      output: join('/test-data', 'backup', '20260102-030405.json'),
    });
    expect(exportMock.mock.invocationCallOrder[0]).toBeLessThan(
      readDirMock.mock.invocationCallOrder[0],
    );
  });

  it('honors filename and password overrides', async () => {
    await expect(
      service.backup({ filename: 'custom.json', password: 'custom-password' }),
    ).resolves.toEqual({ filename: 'custom.json' });
    expect(exportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        password: 'custom-password',
        output: join('/test-data', 'backup', 'custom.json'),
      }),
    );
  });

  it('does not prune existing backups when export fails', async () => {
    const error = new Error('Export failed');
    exportMock.mockRejectedValue(error);
    await expect(service.backup()).rejects.toBe(error);
    expect(readDirMock).not.toHaveBeenCalled();
    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it.each([
    { files: [] },
    { files: ['a.json'] },
    { files: ['a.json', 'b.json'] },
  ])('keeps backups within the retention limit: %j', async ({ files }) => {
    readDirMock.mockResolvedValue(files as any);
    await service.pruneOldBackups();
    expect(statMock).not.toHaveBeenCalled();
    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it('removes the oldest files by modification time, not filename order', async () => {
    readDirMock.mockResolvedValue([
      'a.json',
      'b.json',
      'c.json',
      'd.json',
    ] as any);
    const timestamps: Record<string, number> = {
      'a.json': 40,
      'b.json': 10,
      'c.json': 30,
      'd.json': 20,
    };
    statMock.mockImplementation(
      async (path) =>
        ({ mtimeMs: timestamps[String(path).split('/').pop()!] }) as any,
    );
    await service.pruneOldBackups();
    expect(unlinkMock.mock.calls).toEqual([
      [join('/test-data', 'backup', 'b.json')],
      [join('/test-data', 'backup', 'd.json')],
    ]);
  });

  it('does not delete anything when file metadata cannot be read', async () => {
    readDirMock.mockResolvedValue(['a', 'b', 'c'] as any);
    const error = new Error('Cannot stat backup');
    statMock.mockRejectedValue(error);
    await expect(service.pruneOldBackups()).rejects.toBe(error);
    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it('reports pruning failures instead of reporting a successful backup', async () => {
    readDirMock.mockRejectedValue(new Error('Cannot read backup directory'));
    await expect(service.backup()).rejects.toThrow(
      'Cannot read backup directory',
    );
  });

  it('propagates deletion errors', async () => {
    readDirMock.mockResolvedValue(['a', 'b', 'c'] as any);
    statMock.mockResolvedValue({ mtimeMs: 1 } as any);
    unlinkMock.mockRejectedValue(new Error('Cannot delete backup'));
    await expect(service.pruneOldBackups()).rejects.toThrow(
      'Cannot delete backup',
    );
  });
});
