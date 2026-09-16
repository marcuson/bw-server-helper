import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('schema download validates the response before replacing the existing file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bwsh-schema-'));
  const script = fileURLToPath(
    new URL(
      '../../api-defs/download-vault-management-api.mjs',
      import.meta.url,
    ),
  );
  const schema = {
    openapi: '3.0.0',
    info: {
      title: 'Vault Management API',
      description: 'Quotes " and &quot; stay intact',
    },
    paths: {},
    components: { schemas: {} },
  };
  const page = JSON.stringify({
    props: { swaggerData: { fields: { body: schema } } },
  })
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;');
  try {
    mkdirSync(join(directory, 'api-defs'));
    const target = join(directory, 'api-defs/vault-management-api.json');
    for (const [status, html] of [
      [200, `<div data-page="${page}"></div>`],
      [500, 'Server error'],
      [200, '<html>Maintenance</html>'],
      [200, '<div data-page="{}"></div>'],
    ]) {
      writeFileSync(target, 'original');
      const mock = `globalThis.fetch = async () => new Response(${JSON.stringify(html)}, { status: ${status} });`;
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          `data:text/javascript,${encodeURIComponent(mock)}`,
          script,
        ],
        { cwd: directory, encoding: 'utf8' },
      );
      if (status === 200 && html.includes(page)) {
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(readFileSync(target, 'utf8')), schema);
      } else {
        assert.notEqual(result.status, 0);
        assert.equal(readFileSync(target, 'utf8'), 'original');
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
