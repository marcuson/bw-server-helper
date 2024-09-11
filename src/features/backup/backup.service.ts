import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { appConfig } from '../../app.config';
import { BitwardenService } from '../bitwarden/bitwarden.service';
import { Backup } from './model/backup.model';

export interface BackupOptions {
  password: string;
  filename: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private bw: BitwardenService) {}

  getBackupDir(): string {
    return join(appConfig.props.dataDir, 'backup');
  }

  async backup(options?: Partial<BackupOptions>): Promise<Backup> {
    const defaultOpts: BackupOptions = {
      password: appConfig.props.bwSafePassword,
      filename: format(new Date(), "yyyyMMdd-HHmmss'.json'"),
    };
    const opts = Object.assign(defaultOpts, options);

    await this.bw.export({
      password: opts.password,
      raw: false,
      format: 'encrypted_json',
      output: join(this.getBackupDir(), opts.filename),
    });

    await this.pruneOldBackups();

    return { filename: opts.filename } as Backup;
  }

  async pruneOldBackups(): Promise<void> {
    const backups = await readdir(this.getBackupDir());
    const maxBackupNum = appConfig.props.backupMaxNum;

    if (backups.length <= maxBackupNum) {
      return;
    }

    const statPromises = backups.map((x) => stat(join(this.getBackupDir(), x)));

    const stats = await Promise.all(statPromises);

    const backupFiles = stats
      .map((x, i) => {
        return {
          name: backups[i],
          stat: x,
        };
      })
      .sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);

    const toDeleteBackups = backupFiles.slice(0, -maxBackupNum);

    const deletePromises = toDeleteBackups.map((x) =>
      unlink(join(this.getBackupDir(), x.name)),
    );
    const deleted = await Promise.all(deletePromises);

    this.logger.debug(`Pruned ${deleted.length} old backup files`);
  }
}
