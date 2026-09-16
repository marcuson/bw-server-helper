# Dependency upgrade status

## Completed

- NestJS 12 (framework, Express 5 adapter, Swagger, scheduler, CLI, schematics,
  testing), with `@types/express` 5.
- nestjs-pino 5, Pino 10, pino-http 11, and pino-pretty 13.
- dotenv 17, dotenv-expand 1000, and dotenv-cli 11. Shell-command substitution
  (`$(...)`) in environment files is enabled and covered by the compatibility test.
- semantic-release 25 with current changelog, exec, git, npm, and GitHub plugins.
- TypeScript 6.0, required by Nest schematics 12. TypeScript remains constrained
  to 6.0 because the ESLint parser supports versions below 6.1. Webpack is an
  explicit development dependency satisfying the Nest CLI peer requirement.
- Previous upgrades: Jest 30, ESLint 10, Compodoc 2, date-fns 4, Helmet 8, Joi 18,
  and the independent CLI utilities recorded in `package.json`.

Application output remains ES2021/CommonJS. Node 24 can consume Nest's ESM
packages through `require(esm)`; no application-wide ESM rewrite was needed.
TypeScript 6 changes defaults: `strict: false` preserves the previous opt-in
checks (`noImplicitAny`, `strictNullChecks`, `strictBindCallApply`); Node/Jest
ambient types and the repository root are explicit. Deprecated, unused
`baseUrl` was removed. The pnpm workspace includes only the repository root,
so compiled `dist/package.json` is not treated as another workspace package.

## Repeatable checks

Run after `pnpm install --frozen-lockfile`:

```sh
pnpm run nest:build
pnpm run test:cov --selectProjects unit --runInBand
pnpm run test:integration
pnpm run test:release
pnpm run lint:check
pnpm exec compodoc -d /tmp/bwsh-upgrade-docs --silent
```

- Unit tests retain the 80% coverage gates and exclusion of generated Bitwarden
  models. Environment fixtures cover existing-variable and first-file precedence,
  chained expansion, defaults, empty values, repeated loads, and missing files.
- HTTP integration runs the real compiled Nest/Express graph with simulated
  Bitwarden and backup providers. It checks root/version/backup routes, disabled
  APIs, errors, Swagger JSON, cron registration, and startup/shutdown hooks.
- Release checks import all configured plugins and simulate `main`, `alpha`, and
  `beta` in temporary local Git repositories. Only analysis and release-note
  generation run in dry-run mode; Docker/GitHub publishing hooks are omitted.
  The npm prepare hook updates a temporary manifest, followed by an offline
  frozen-lockfile check. No actual release or image is published.

## Deliberately excluded

### TypeScript 7 and Node 26 types

Installed ts-jest requires TypeScript `<7`; the ESLint parser requires `<6.1.0`.
Do not force incompatible peers. Recheck both before changing the compiler:

```sh
pnpm view ts-jest peerDependencies
pnpm view @typescript-eslint/parser peerDependencies
```

`@types/node` stays on major 24 to match the project's LTS runtime.

## Remaining deployment verification

The Docker daemon was unavailable during this upgrade, so image build and
container startup/shutdown still need verification. The compiled application and
local HTTP lifecycle checks passed; they do not substitute for an Alpine image
check. Use an isolated CLI stub/test account, never a production vault.

References: [Nest migration](https://docs.nestjs.com/migration-guide),
[Express 5 migration](https://expressjs.com/en/guide/migrating-5/),
[dotenv-expand changelog](https://github.com/dotenvx/dotenv-expand/blob/master/CHANGELOG.md).
