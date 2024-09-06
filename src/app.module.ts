import {
  DynamicModule,
  ForwardReference,
  Logger,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Type,
} from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { appConfig } from './app.config';
import { BackupModule } from './features/backup/backup.module';
import { BitwardenModule } from './features/bitwarden/bitwarden.module';
import { BitwardenService } from './features/bitwarden/bitwarden.service';
import { VersionModule } from './features/version/version.module';
import { HomeController } from './home.controller';

type ModuleDef =
  | Type<any>
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference<any>;

const imports: (ModuleDef | undefined)[] = [
  LoggerModule.forRoot({
    pinoHttp: {
      level: appConfig.props.pinoLevel || 'info',
      transport: appConfig.props.pinoShouldPrettifyLogger
        ? {
            target: 'pino-pretty',
            options: { singleLine: true },
          }
        : undefined,
    },
    exclude: ['/healthcheck'],
  }),
  BackupModule,
  BitwardenModule,
  ScheduleModule.forRoot(),
  VersionModule,
];

const filteredImports: ModuleDef[] = imports.filter((x) => !!x) as ModuleDef[];

@Module({
  imports: filteredImports,
  controllers: [HomeController],
})
export class AppModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AppModule.name);

  constructor(private bw: BitwardenService) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Bootstrapping AppModule');
    await this.bw.initAppSession();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (appConfig.props.nodeEnv === 'development') {
      return;
    }

    if (signal) {
      this.logger.warn(`Exit signal received: ${signal}`);
    }

    this.logger.log('Shutting down AppModule');
    await this.bw.closeAppSession();
  }
}
