import { Module } from '@nestjs/common';
import { appConfig } from 'src/app.config';
import { BitwardenModule } from '../bitwarden/bitwarden.module';
import { BackupController } from './backup.controller';
import { BackupSchedule } from './backup.schedule';
import { BackupService } from './backup.service';

const providers = [
  BackupService,
  appConfig.props.scheduleEnabled ? BackupSchedule : undefined,
].filter((x) => x !== undefined);

@Module({
  imports: [BitwardenModule],
  providers: providers,
  exports: [BackupService],
  controllers: !appConfig.props.apiEnabled ? [] : [BackupController],
})
export class BackupModule {}
