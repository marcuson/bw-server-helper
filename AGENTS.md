# Repository guidance

## Purpose and stack

Bitwarden Server Helper is a backend service for exporting encrypted Bitwarden
vault backups, pruning old backups, and optionally running scheduled backups with
Healthchecks pings. There is no frontend or database layer.

- TypeScript 5, NestJS 10, and the Express platform adapter.
- Node.js >=24.21.0; Docker, GitHub Actions, and `.nvmrc` use Node 24.21.0 LTS. Use pnpm 10.34.5
  (pinned in `package.json`; enable with `corepack enable`) and keep
  `pnpm-lock.yaml` synchronized with dependency changes (`pnpm install --frozen-lockfile` for setup).
- `@nestjs/schedule` for cron jobs; `date-fns` for backup filenames.
- Joi, `dotenv`, and `dotenv-expand` for environment configuration.
- `nestjs-pino`/Pino for logging, Helmet for HTTP security headers, and Nest Swagger
  for optional API documentation. Healthchecks requests use Axios directly.
- Jest 29, `ts-jest`, and `@nestjs/testing` for tests; ESLint and Prettier for style.
- Compodoc generates technical docs; semantic-release handles releases.

## Code map and behavior

- `src/main.ts`: loads `.env`, validates configuration, then imports the
  bootstrapper. **Preserve this ordering**: modules and decorators read
  `appConfig.props` at import time. Sets `TZ=Etc/UTC` if it is unset.
- `src/app.bootstrap.ts`: creates the app, configures logging, Helmet, CORS,
  shutdown hooks, optional Swagger (`/api`, JSON at `/api-json`), and the listener.
- `src/app.module.ts`: wires features and initializes the Bitwarden session on
  application bootstrap. Shutdown locks/logs out except in development.
- `src/app.config.ts`, `src/config/`: singleton configuration loader, typed
  properties, and authoritative environment schemas/defaults.
- `src/features/bitwarden/`: `BitwardenService` runs the external `bw` CLI through
  `child_process.exec` for status, login, unlock, export, lock, and logout. The
  runtime does not call the Vault Management HTTP API.
- `src/features/backup/`: controller, service, scheduler, and response model.
  `POST /api/backup` exports `encrypted_json` to `DATA_DIR/backup` using filenames
  like `yyyyMMdd-HHmmss.json`, then prunes oldest entries by modification time.
- `src/features/healthchecks/`: global service and `@MeasuredHealthcheck`
  decorator send start, success, and failure pings around scheduled work.
- `src/features/version/`: `GET /api/version`; `src/home.controller.ts`: `GET /`.
  Version values come from `package.json` through `src/utils/package-json.utils.ts`.
- `api-defs/bw-vault-management.openapi.json`: source for generated Bitwarden
  models under `src/features/bitwarden/model/`.
- Tests are colocated `src/**/*.spec.ts`; `test/jest.config.ts` defines unit and
  e2e projects, with environment fixtures under `test/`.

## Setup and commands

Run commands from the repository root. For a live local service, copy
`.env.example` to `.env`, replace placeholders, and choose a writable `DATA_DIR`.
The host must have the `bw` executable available; it is not an npm dependency of
this project. The Docker image installs `@bitwarden/cli` globally with pnpm.
Dependency lifecycle scripts are explicitly configured in `pnpm-workspace.yaml`;
Donation-only hooks and Compodoc's broken published postinstall are disabled
(the Compodoc package already includes its documentation assets).
Declare directly imported packages and release plugins in `package.json`; do not
rely on npm-style dependency hoisting.

| Task | Command / notes |
| --- | --- |
| Install dependencies | `pnpm install --frozen-lockfile` |
| Watch mode | `pnpm run start:dev` |
| Debug watch mode | `pnpm run start:debug` (debugger port 9229) |
| Compile application only | `pnpm run nest:build` |
| Full build | `pnpm run build` (also deletes and regenerates Compodoc docs) |
| Run compiled app | `pnpm run start:prod` (`dist/src/main`) |
| Unit tests | `pnpm test` or `pnpm run test:unit` |
| One unit spec | `pnpm run test:unit --runInBand --runTestsByPath src/app.config.spec.ts` |
| Unit coverage | `pnpm run test:cov --selectProjects unit` |
| E2E tests | `pnpm run test:e2e` (no e2e specs currently checked in) |
| Format source/tests | `pnpm run format` (writes files) |
| Lint | `pnpm run lint` (writes fixes; see compatibility note below) |
| Generate / serve docs | `pnpm run doc` / `pnpm run doc:serve` |
| Build local Docker image | `pnpm run docker:local:build` |
| Run local Compose stack | `pnpm run docker:local:compose up --build` |

Known tooling caveats:

- ESLint 9 is declared, but configuration remains `.eslintrc.js`. If lint fails
  looking for flat configuration, use `ESLINT_USE_FLAT_CONFIG=false pnpm run lint`.
  For a check without fixes, use
  `ESLINT_USE_FLAT_CONFIG=false pnpm exec eslint "{src,apps,libs,test}/**/*.ts"`.
- Prefer pnpm test scripts: they explicitly select `test/jest.config.ts` and set
  Node options. Plain `jest` can pick the separate configuration in `package.json`.
- `test:prep` references missing `test/transformers/*.ts`; it is not a
  prerequisite for the normal test scripts.

## Configuration rules

Read defaults from `src/config/env-config.ts`, rather than assuming `.env.example`
represents production defaults. When adding configuration, update the schema,
`AppConfigProps`, relevant tests, `.env.example`, and README documentation together.

- Required: `BW_CLIENTID`, `BW_CLIENTSECRET`, `BW_SAFE_PASSWORD`.
- Storage/server defaults: `BW_SERVER_URL=https://bitwarden.com`,
  `DATA_DIR=/bwsh/data`, `BACKUP_MAX_NUM=30`.
- HTTP defaults: `API_ENABLED=true`, `IP_BIND=0.0.0.0`, `PORT=3000`,
  `SWAGGER_ENABLED=false`. Disabling API removes backup/version controllers;
  it does not disable the listener or root route.
- Scheduling defaults: `SCHEDULE_ENABLED=false`,
  `SCHEDULE_BACKUP_CRON="0 0 * * *"`; optional
  `SCHEDULE_BACKUP_HEALTHCHECKS_URL` enables backup pings.
- Logging/runtime defaults: `LOG_LEVEL=info`, `PINO_PRETTIFY=true`,
  `NODE_ENV=production`; timezone comes from `TZ` in `main.ts`.
- Empty strings are treated as missing before Joi validation. In particular,
  an empty cron value receives the default despite README claiming it disables
  that task. Do not rely on empty strings to disable scheduling.

## Implementation and verification

- Use English for all project code (including identifiers and messages) and
  comments, regardless of the language used in the chat. Chat conversations may
  use other languages without changing this project convention.
- Follow feature-based Nest modules, injected services, thin controllers, and
  existing Swagger decorators/response classes. Use Nest `Logger` as existing
  services do; the app routes logging through Pino.
- Follow existing TypeScript style: two-space indentation, single quotes,
  semicolons, trailing commas, PascalCase classes, camelCase members, and
  filenames such as `backup.service.ts`. Generated models have their own naming.
- Compilation targets ES2021/CommonJS with decorator metadata, strict null
  checks, and `noImplicitAny`; preserve those constraints.
- For behavior changes, add focused colocated Jest tests and run the affected
  tests plus `pnpm run nest:build`. Run broader unit tests when shared behavior
  changes. Check formatting/lint on touched source files and report blockers.
- Mock CLI execution, filesystem deletion/export, and outbound Healthchecks
  requests in tests. Use temporary directories for filesystem behavior tests.
  Do not use real vault credentials or mutate a user's CLI session to validate
  ordinary code changes.
- Configuration tests mutate `process.env` and the shared `appConfig` singleton;
  isolate/restore state in new tests. Initialize configuration before importing
  modules whose registration or decorators depend on its values.
- No dedicated test/lint step exists in the current release workflow; do not
  assume CI runs these checks. Documentation-only changes need content review,
  not a live service startup.

## Generated files, runtime data, and releases

- Do not hand-edit generated `src/features/bitwarden/model/` files. Update the
  OpenAPI source and run `pnpm run g:api:bwvaultman` when regeneration is needed.
  This deletes the model directory and uses Docker OpenAPI Generator with a
  repository bind mount; inspect all generated changes.
- `docs/compodoc/` is tracked generated output. Edit source comments/configuration
  and regenerate when documentation output is part of the task. Use
  `pnpm run nest:build` for compilation checks that should not regenerate docs.
- Keep credentials, `BW_SESSION`, vault exports, and CLI state out of logs,
  fixtures, and commits. `.env` and `local-vol/` are ignored. Existing shell
  command construction includes sensitive arguments; do not log command strings
  or extend interpolation with untrusted input. Prefer argument-based process
  execution when modifying that boundary.
- Backup retention deletes filesystem entries. Preserve encrypted exports and
  scope deletion to the intended backup directory; validate changes with isolated
  fixtures. The API has no built-in authentication, so preserve/document its
  requirement for external authentication when publicly exposed.
- Docker uses a multi-stage Node 24.21.0 Alpine build, runs as `node`, and uses `tini`.
  CLI state is at `/bwsh/bwcli`; backups default to `/bwsh/data`. Local Compose
  loads `.env`, exposes port 3000, and mounts `./local-vol` at `/bwsh/data`; ensure
  `DATA_DIR` matches the container mount when using the development env template.
- Releases use semantic-release with Angular-style commits (`feat:`, `fix:`,
  `chore:`, etc.), `main` for stable and `alpha`/`beta` prerelease branches.
  Version tags have no `v` prefix. Release scripts publish multiarch Docker images
  and update Docker Hub metadata; they are not local validation commands.
