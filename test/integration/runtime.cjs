// Run against compiled CommonJS output and the real Nest/Express dependency graph.
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const { Test } = require('@nestjs/testing');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const { SchedulerRegistry } = require('@nestjs/schedule');
const request = require('supertest');
const { appConfig } = require('../../dist/src/app.config');

const enabled = process.argv[2] === 'enabled';
Object.assign(process.env, {
  BW_CLIENTID: 'test-client',
  BW_CLIENTSECRET: 'test-secret',
  BW_SAFE_PASSWORD: 'test-password',
  API_ENABLED: String(enabled),
  SCHEDULE_ENABLED: String(enabled),
  SCHEDULE_BACKUP_CRON: '0 0 1 1 *',
  PINO_PRETTIFY: 'false',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
});
appConfig.actualizeFromEnv();
const { AppModule } = require('../../dist/src/app.module');
const {
  BitwardenService,
} = require('../../dist/src/features/bitwarden/bitwarden.service');
const {
  BackupService,
} = require('../../dist/src/features/backup/backup.service');

(async () => {
  const bw = { initAppSession: mock.fn(), closeAppSession: mock.fn() };
  const backup = mock.fn(async () => ({ filename: 'test-backup.json' }));
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(BitwardenService)
    .useValue(bw)
    .overrideProvider(BackupService)
    .useValue({ backup })
    .compile();
  const app = module.createNestApplication({ logger: false });
  try {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test').setVersion('1').build(),
    );
    SwaggerModule.setup('api', app, document);
    await app.init();
    assert.equal(bw.initAppSession.mock.callCount(), 1);
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(/Bitwarden Server Helper/);
    await request(app.getHttpServer())
      .get('/api/version')
      .expect(enabled ? 200 : 404);
    const result = await request(app.getHttpServer())
      .post('/api/backup')
      .expect(enabled ? 201 : 404);
    if (enabled) {
      assert.equal(result.body.filename, 'test-backup.json');
      backup.mock.mockImplementation(async () => {
        throw new Error('Test failure');
      });
      await request(app.getHttpServer()).post('/api/backup').expect(500);
    } else {
      assert.equal(backup.mock.callCount(), 0);
    }
    const spec = await request(app.getHttpServer())
      .get('/api-json')
      .expect(200);
    assert.equal(Boolean(spec.body.paths['/api/backup']), enabled);
    const jobs = module.get(SchedulerRegistry).getCronJobs();
    assert.equal(jobs.size, enabled ? 1 : 0);
  } finally {
    await app.close();
  }
  assert.equal(bw.closeAppSession.mock.callCount(), 1);
  console.log(
    `Runtime integration passed (API and schedule ${enabled ? 'enabled' : 'disabled'}).`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
