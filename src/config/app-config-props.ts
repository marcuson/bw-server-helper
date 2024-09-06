import { MutablePartOf } from 'src/utils/type.utils';

export class AppConfigProps {
  apiEnabled: boolean;
  bwServerUrl: string;
  bwClientId: string;
  bwClientSecret: string;
  bwSafePassword: string;
  dataDir: string;
  ipBind: string;
  nodeEnv: string;
  pinoLevel: string | undefined;
  pinoShouldPrettifyLogger: boolean;
  port: number;
  scheduleEnabled: boolean;
  scheduleBackupCron: string | undefined;
  swaggerEnabled: boolean;
}

export type AppConfigMutablePart = MutablePartOf<AppConfigProps>;
export type AppConfigMutableKey = keyof AppConfigMutablePart;
