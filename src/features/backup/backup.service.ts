import { Injectable, Post } from '@nestjs/common';
import { format } from 'date-fns';
import { join } from 'path';
import { appConfig } from 'src/app.config';
import { BitwardenService } from '../bitwarden/bitwarden.service';

export interface BackupOptions {
  password: string;
  filename: string;
}

@Injectable()
export class BackupService {
  constructor(private bw: BitwardenService) {}

  @Post()
  async backup(options?: Partial<BackupOptions>): Promise<void> {
    const defaultOpts: BackupOptions = {
      password: appConfig.props.bwSafePassword,
      filename: format(new Date(), "yyyyMMdd-HHmmss'.json'"),
    };
    const opts = Object.assign(defaultOpts, options);

    await this.bw.export({
      password: opts.password,
      raw: false,
      format: 'encrypted_json',
      output: join(appConfig.props.dataDir, 'backup', opts.filename),
    });
  }
}
