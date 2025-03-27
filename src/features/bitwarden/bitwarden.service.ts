import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { appConfig } from '../../app.config';
import { StatusDataTemplate } from './model/statusDataTemplate';

const execPromise = promisify(exec);

export interface BWExportOptions {
  password: string;
  raw?: boolean;
  output?: string;
  format: 'csv' | 'json' | 'encrypted_json';
}

@Injectable()
export class BitwardenService {
  private logger = new Logger(BitwardenService.name);

  constructor() {}

  private async setServerUrl(url: string) {
    await execPromise(`bw config server ${url}`);
  }

  async initAppSession(): Promise<void> {
    this.logger.debug('Init app session');

    const status = await this.getStatus();

    if (
      status.serverUrl !== appConfig.props.bwServerUrl &&
      status.status !== StatusDataTemplate.StatusEnum.Unauthenticated
    ) {
      this.logger.warn(
        'Current BW CLI config does not match configured server, closing previous session',
      );
      await this.closeAppSession();
    }

    if (status.serverUrl !== appConfig.props.bwServerUrl) {
      this.logger.log(
        `Setting BW CLI server url to ${appConfig.props.bwServerUrl}`,
      );
      await this.setServerUrl(appConfig.props.bwServerUrl);
    }

    switch (status.status) {
      case StatusDataTemplate.StatusEnum.Unauthenticated:
        this.logger.log(`BW CLI not logged in, login and unlock`);
        await this.login();
        await this.unlock();
        break;
      case StatusDataTemplate.StatusEnum.Locked:
        this.logger.log(`BW CLI logged in but not unlocked, unlocking`);
        await this.unlock();
        break;
      case StatusDataTemplate.StatusEnum.Unlocked:
        this.logger.log(`BW CLI already unlocked, continue`);
        break;
    }
  }

  async closeAppSession(): Promise<void> {
    this.logger.debug('Close app session');
    const status = await this.getStatus();

    switch (status.status) {
      case StatusDataTemplate.StatusEnum.Unlocked:
        this.logger.log(`BW CLI unlocked, lock and logout`);
        await this.lock();
        await this.logout();
        break;
      case StatusDataTemplate.StatusEnum.Locked:
        this.logger.log(`BW CLI locked but logged in, logout`);
        await this.logout();
        break;
      case StatusDataTemplate.StatusEnum.Unauthenticated:
        this.logger.log(`BW CLI already logged out, continue`);
        break;
    }
  }

  async getStatus(): Promise<StatusDataTemplate> {
    process.env.BW_SAFE_PASSWORD = appConfig.props.bwSafePassword;
    const res = await execPromise('bw status');
    return JSON.parse(res.stdout) as StatusDataTemplate;
  }

  async login(): Promise<void> {
    process.env.BW_CLIENTID = appConfig.props.bwClientId;
    process.env.BW_CLIENTSECRET = appConfig.props.bwClientSecret;
    await execPromise('bw login --apikey');
  }

  async logout(): Promise<void> {
    await execPromise('bw logout');
  }

  async unlock(): Promise<string> {
    process.env.BW_SAFE_PASSWORD = appConfig.props.bwSafePassword;
    const res = await execPromise(
      'bw unlock --raw --passwordenv BW_SAFE_PASSWORD',
    );

    process.env.BW_SESSION = res.stdout;
    return res.stdout;
  }

  async lock(): Promise<void> {
    await execPromise('bw lock');
  }

  async export(options?: Partial<BWExportOptions>): Promise<string> {
    const defaultOpts: BWExportOptions = {
      password: appConfig.props.bwSafePassword,
      raw: true,
      format: 'encrypted_json',
    };
    const opts = Object.assign(defaultOpts, options);

    if (!opts.raw && !opts.output) {
      throw new Error(
        'At least options.raw should be true OR options.output should be valued',
      );
    }

    let cmd = `bw export --format ${opts.format}`;
    if (opts.format === 'encrypted_json') {
      cmd += ` --password ${opts.password}`;
    }

    if (opts.raw && !opts.output) {
      cmd += ` --raw`;
    } else {
      cmd += ` --output ${opts.output}`;
    }

    const res = await execPromise(cmd);
    return res.stdout;
  }
}
