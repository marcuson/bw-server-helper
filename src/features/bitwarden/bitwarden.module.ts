import { Module } from '@nestjs/common';
import { BitwardenService } from './bitwarden.service';

@Module({
  imports: [],
  providers: [BitwardenService],
  exports: [BitwardenService],
  controllers: [],
})
export class BitwardenModule {}
