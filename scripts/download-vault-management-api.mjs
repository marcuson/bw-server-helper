import assert from 'node:assert/strict';
import { writeFile, rename } from 'node:fs/promises';

const response = await fetch(
  'https://bitwarden.com/help/vault-management-api/',
  {
    signal: AbortSignal.timeout(30_000),
  },
);
assert(
  response.ok,
  `Bitwarden schema download failed: HTTP ${response.status}`,
);
const html = await response.text();
const encodedPage = html.match(/\bdata-page="([^"]+)"/)?.[1];
assert(encodedPage, 'Bitwarden page does not contain schema data');
// Decode the HTML attribute once, preserving entities inside JSON string values.
const entities = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'" };
const page = JSON.parse(
  encodedPage.replace(
    /&(quot|amp|lt|gt|apos|#\d+|#x[\da-f]+);/gi,
    (_, entity) =>
      entity.startsWith('#')
        ? String.fromCodePoint(
            entity[1].toLowerCase() === 'x'
              ? parseInt(entity.slice(2), 16)
              : Number(entity.slice(1)),
          )
        : entities[entity.toLowerCase()],
  ),
);
const schema = page.props?.swaggerData?.fields?.body;
assert(
  schema?.openapi?.startsWith('3.') &&
    schema.info?.title === 'Vault Management API' &&
    schema.paths &&
    schema.components?.schemas,
  'Bitwarden page does not contain the expected OpenAPI schema',
);
const target = 'api-defs/vault-management-api.json';
await writeFile(`${target}.tmp`, `${JSON.stringify(schema, null, 2)}\n`);
await rename(`${target}.tmp`, target);
console.log(`Updated ${target}`);
