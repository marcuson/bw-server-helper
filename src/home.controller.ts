import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { getAppVersion } from './utils/package-json.utils';

@ApiExcludeController()
@Controller()
export class HomeController {
  constructor() {}

  @Get()
  async getVersion(): Promise<string> {
    return 'Bitwarden Server Helper (BWSH) v' + getAppVersion();
  }
}
