import { BackupController } from './backup.controller';
import { BackupSchedule } from './backup.schedule';
import { BackupService } from './backup.service';

// Scheduling is invoked explicitly; no cron timer or HTTP request is started.
jest.mock('../healthchecks/healthchecks.decorators', () => ({
  MeasuredHealthcheck: () => () => undefined,
}));

describe('Backup entrypoints', () => {
  const backup = jest.fn();
  const service = { backup } as unknown as BackupService;

  beforeEach(() => backup.mockReset());

  it('returns the backup result from the API', async () => {
    backup.mockResolvedValue({ filename: 'daily.json' });
    await expect(new BackupController(service).backup()).resolves.toEqual({
      filename: 'daily.json',
    });
    expect(backup).toHaveBeenCalledTimes(1);
  });

  it('waits for scheduled backup completion', async () => {
    let complete!: () => void;
    backup.mockReturnValue(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    let finished = false;
    const result = new BackupSchedule(service).backupCron().then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    complete();
    await result;
    expect(finished).toBe(true);
    expect(backup).toHaveBeenCalledTimes(1);
  });

  it.each(['controller', 'schedule'])(
    'propagates failures from the %s',
    async (entrypoint) => {
      backup.mockRejectedValue(new Error('Backup failed'));
      const result =
        entrypoint === 'controller'
          ? new BackupController(service).backup()
          : new BackupSchedule(service).backupCron();
      await expect(result).rejects.toThrow('Backup failed');
    },
  );
});
