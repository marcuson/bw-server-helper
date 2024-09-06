import Joi, { Schema } from 'joi';
import { AppConfigMutableKey, AppConfigMutablePart } from './app-config-props';

type CfgInfo<TSchema> = {
  propName: keyof AppConfigMutablePart;
  schema: Schema<TSchema>;
};

function cfg<TSchema>(
  propName: AppConfigMutableKey,
  schema: Schema<TSchema>,
): CfgInfo<TSchema> {
  return {
    propName,
    schema,
  };
}

// Env config is here
export const envCfg = {
  API_ENABLED: cfg('apiEnabled', Joi.bool().optional().default(false)),
  BW_CLIENTID: cfg('bwClientId', Joi.string().required()),
  BW_CLIENTSECRET: cfg('bwClientSecret', Joi.string().required()),
  BW_SAFE_PASSWORD: cfg('bwSafePassword', Joi.string().required()),
  BW_SERVER_URL: cfg('bwServerUrl', Joi.string().required()),
  DATA_DIR: cfg('dataDir', Joi.string().required()),
  IP_BIND: cfg('ipBind', Joi.string().optional().ip().default('0.0.0.0')),
  LOG_LEVEL: cfg(
    'pinoLevel',
    Joi.string()
      .allow('trace', 'debug', 'info', 'warn', 'error')
      .optional()
      .default('info'),
  ),
  PINO_PRETTIFY: cfg(
    'pinoShouldPrettifyLogger',
    Joi.bool().optional().default(false),
  ),
  PORT: cfg(
    'port',
    Joi.number().optional().default(3000).prefs({
      convert: true,
    }),
  ),
  SCHEDULE_ENABLED: cfg(
    'scheduleEnabled',
    Joi.bool().optional().default(false),
  ),
  SCHEDULE_BACKUP_CRON: cfg(
    'scheduleBackupCron',
    Joi.string().optional().default(''),
  ),
  SWAGGER_ENABLED: cfg('swaggerEnabled', Joi.bool().optional().default(false)),
  NODE_ENV: cfg('nodeEnv', Joi.string().optional().default('production')),
};

export type EnvCfgType = typeof envCfg;
export type EnvCfgTypeKey = keyof EnvCfgType;

export type EnvSchemaType = {
  [k in keyof EnvCfgType]: EnvCfgType[k]['schema'];
};
export type EnvType = { [key in EnvCfgTypeKey]: any };
