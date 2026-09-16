import { Injectable, Logger } from '@nestjs/common';
import { ZipWriter } from '@zip.js/zip.js';
import { format } from 'date-fns';
import { createWriteStream, openAsBlob } from 'fs';
import {
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'fs/promises';
import { basename, join } from 'path';
import { Writable } from 'stream';
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
      filename: format(new Date(), "yyyyMMdd-HHmmss'.zip'"),
    };
    const opts = Object.assign(defaultOpts, options);

    if (
      !opts.filename ||
      basename(opts.filename) !== opts.filename ||
      /[\\\x00-\x1f]/.test(opts.filename) ||
      opts.filename === '.' ||
      opts.filename === '..'
    ) {
      throw new Error('Backup filename must be a plain filename');
    }
    if (!opts.password) throw new Error('Backup password must not be empty');
    opts.filename = opts.filename.replace(/(?:\.json|\.zip)?$/i, '.zip');
    await mkdir(this.getBackupDir(), { recursive: true });
    const temporaryDir = await mkdtemp(
      join(appConfig.props.dataDir, '.backup-'),
    );
    try {
      await this.bw.export({
        password: opts.password,
        raw: false,
        format: 'encrypted_json',
        output: join(temporaryDir, 'vault.json'),
      });
      const files = ['vault.json'];
      const organizationList = ['Filename\tOrganization ID\tOrganization name'];
      const organizations = await this.bw.getOrgs();
      for (const organization of organizations) {
        if (
          !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
            organization.id,
          )
        ) {
          throw new Error('Invalid organization ID');
        }
        const slug =
          organization.name
            .normalize('NFKD')
            .replace(/\p{M}/gu, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 80)
            .replace(/^-+|-+$/g, '') || 'organization';
        let filename = `org-${slug}.json`;
        for (let suffix = 2; files.includes(filename); suffix++) {
          filename = `org-${slug}-${suffix}.json`;
        }
        await this.bw.export({
          password: opts.password,
          raw: false,
          format: 'encrypted_json',
          organizationId: organization.id,
          output: join(temporaryDir, filename),
        });
        files.push(filename);
        organizationList.push(
          `${filename}\t${organization.id}\t${JSON.stringify(organization.name)}`,
        );
      }
      await writeFile(
        join(temporaryDir, 'organizations.txt'),
        `${organizationList.join('\n')}\n`,
        { mode: 0o600 },
      );
      files.push('organizations.txt');
      const archive = join(temporaryDir, 'backup.zip');
      const output = createWriteStream(archive, { mode: 0o600 });
      try {
        const zip = new ZipWriter(Writable.toWeb(output), {
          password: opts.password,
          encryptionStrength: 3,
          zipCrypto: false,
          useWebWorkers: false,
        });
        for (const filename of files) {
          const input = await openAsBlob(join(temporaryDir, filename));
          await zip.add(filename, input.stream());
        }
        await zip.close();
      } finally {
        output.destroy();
      }
      await rename(archive, join(this.getBackupDir(), opts.filename));
    } finally {
      await rm(temporaryDir, { recursive: true, force: true });
    }

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
