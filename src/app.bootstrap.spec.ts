import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { appConfig } from './app.config';
import { bootstrap } from './app.bootstrap';

jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));

describe('Application bootstrap', () => {
  const originalConfig = { ...appConfig.props };
  const logger = {};
  const app = {
    get: jest.fn().mockReturnValue(logger),
    useLogger: jest.fn(),
    useGlobalInterceptors: jest.fn(),
    enableShutdownHooks: jest.fn(),
    use: jest.fn(),
    enableCors: jest.fn(),
    listen: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(appConfig.props, {
      swaggerEnabled: false,
      port: 4321,
      ipBind: '127.0.0.1',
    });
    jest.spyOn(NestFactory, 'create').mockResolvedValue(app as any);
    jest.spyOn(SwaggerModule, 'createDocument').mockReturnValue({} as any);
    jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const key of Object.keys(appConfig.props))
      delete (appConfig.props as any)[key];
    Object.assign(appConfig.props, originalConfig);
  });

  it('configures logging, security middleware, shutdown hooks and the listener', async () => {
    await bootstrap();
    expect(app.get).toHaveBeenCalledWith(Logger);
    expect(app.useLogger).toHaveBeenCalledWith(logger);
    expect(app.useGlobalInterceptors).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(expect.any(Function));
    expect(app.enableShutdownHooks).toHaveBeenCalledTimes(1);
    expect(app.enableCors).toHaveBeenCalledTimes(1);
    expect(app.listen).toHaveBeenCalledWith(4321, '127.0.0.1');
    expect(SwaggerModule.setup).not.toHaveBeenCalled();
  });

  it('exposes Swagger only when enabled and uses the package version', async () => {
    appConfig.props.swaggerEnabled = true;
    await bootstrap();
    expect(SwaggerModule.createDocument).toHaveBeenCalledWith(
      app,
      expect.objectContaining({
        info: expect.objectContaining({
          version: jest.requireActual('../package.json').version,
        }),
      }),
    );
    expect(SwaggerModule.setup).toHaveBeenCalledWith('api', app, {});
  });

  it('propagates listener failures', async () => {
    app.listen.mockRejectedValueOnce(new Error('Address already in use'));
    await expect(bootstrap()).rejects.toThrow('Address already in use');
  });
});
