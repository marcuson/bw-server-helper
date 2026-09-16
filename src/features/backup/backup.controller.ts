import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { Backup } from './model/backup.model';

@ApiTags('backup')
@Controller('api/backup')
export class BackupController {
  constructor(private backupSrv: BackupService) {}

  @Post()
  async backup(): Promise<Backup> {
    return await this.backupSrv.backup();
  }
}
