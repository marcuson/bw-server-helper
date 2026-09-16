# Bitwarden Server Helper

## Installation

You can run this software via Docker:

```bash
docker run marcuson/bw-server-helper
```

## Configuration

You can configure the way the app works with the following env vars:

| Env var                          | Default value           | Notes                                                                                                                                                                |
| -------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API_ENABLED                      | `true`                  | Whether the API is enabled or not. **Note**: the API is not authenticated and you **should** provide an external authentication mechanism if exposing this publicly! |
| BACKUP_MAX_NUM                   | `30`                    | Maximum number of most recent backups to keep.                                                                                                                       |
| BW_CLIENTID                      | -                       | **Required**. Client id of your user in your Bitwarden instance.                                                                                                     |
| BW_CLIENTSECRET                  | -                       | **Required**. Client secret of your user in your Bitwarden instance.                                                                                                 |
| BW_SAFE_PASSWORD                 | -                       | **Required**. Password of your Bitwarden safe.                                                                                                                       |
| BW_SERVER_URL                    | `https://bitwarden.com` | URL of the server where you Bitwarden instance is. Use `https://bitwarden.com` for America, `https://bitwarden.eu` for Europe or insert your self-hosted URL.        |
| DATA_DIR                         | `/bwsh/data`            | Location where Bitwarden Server Helper related data will be stored. It should be persistent (mount a volume or local directory to this path).                        |
| IP_BIND                          | `0.0.0.0`               | IP where to bind the web server for API.                                                                                                                             |
| LOG_LEVEL                        | `info`                  | Max log level to be shown.                                                                                                                                           |
| PORT                             | `3000`                  | Bind port of API.                                                                                                                                                    |
| SCHEDULE_ENABLED                 | `false`                 | Whether the scheduled actions are enabled or not.                                                                                                                    |
| SCHEDULE_BACKUP_CRON             | `0 0 * * *`             | The cron expression for automated backups. Pass an empty string to disable this specific task.                                                                       |
| SCHEDULE_BACKUP_HEALTHCHECKS_URL | -                       | URL of healthcheck check to use during scheduled backups. Leave blank to disable Healthchecks integration.                                                           |
| NODE_ENV                         | `production`            | The Node environment used for libraries like Express. Suggested to leave as per default.                                                                             |
| TZ                               | `Etc/UTC`               | The timezone used for schedules.                                                                                                                                     |

## Backups

Each backup creates one `yyyyMMdd-HHmmss.zip` archive in `DATA_DIR/backup`.
It contains `vault.json` for the personal vault and `org-<sanitized-name>.json`
for every organization returned by `bw list organizations`. Organization filenames
use lowercase ASCII slugs (up to 80 characters), with numeric suffixes for collisions
and `organization` as the fallback for empty slugs. The encrypted `organizations.txt`
entry maps filenames to organization IDs and original names (JSON-quoted to escape
line breaks and tabs). It contains only its header when there are no organizations.
Each JSON export
is password-encrypted using `BW_SAFE_PASSWORD`; the ZIP also uses the same password
with WinZip-compatible AES-256 encryption. Open it with an AES-capable tool such
as 7-Zip or PeaZip, then import the encrypted JSON into Bitwarden. ZIP entry names
remain visible without the password.
The CLI account must have permission to export every organization.

Exports are staged in a temporary directory under `DATA_DIR`, then compressed
into a ZIP and moved into the backup directory. If any export or ZIP creation
fails, temporary files are removed and existing backups are not pruned.
Retention counts each ZIP as one backup and also includes older JSON backups.

## Development

### Prerequisites

- use Node.js 24.21.0 LTS or newer and pnpm 12.4.2 (pinned in `package.json`)
- `.nvmrc` pins the development runtime; use `nvm install && nvm use` (or `fnm use --install-if-missing`)
- enable pnpm with `corepack enable`; Corepack selects the pinned version in this repository
  (see the [pnpm installation guide](https://pnpm.io/installation) if Corepack is unavailable)
- you should have Docker installed
- configure the ".env" file (copy template from ".env.example")
- run `pnpm install` to get all needed deps from NPM

### Start app

Once the prerequisites are met, you should:

- run `pnpm run start:debug`. You can attach nodejs debugger to port 9229.

### Docs

We use Compodoc to automatically generate technical docs from source code. The generation
process must be started manually running the `pnpm run doc` command from shell. After a succesfull
execution, the generated documentation will be available in "docs/compodoc".

### Test

```bash
# unit tests
pnpm run test:unit

# unit tests coverage
pnpm run test:cov --selectProjects unit

# e2e tests
pnpm run test:e2e
```

Coverage reports are written to `coverage/` (HTML: `coverage/lcov-report/index.html`).
Coverage includes untested source files; all files under `src/features/bitwarden/model/`
are excluded. Coverage runs enforce a minimum of 80% for statements, branches,
functions, and lines.
Tests mock CLI commands, backup filesystem operations, and HTTP requests, so they do
not require vault credentials or network access.

### Useful dev info

- If you want to import local files in plugins of "nest-cli.json", you must use `.js` files AND
  write a path relative to the "\<repo root\>/node_modules" folder!

### Dependency upgrades

Completed major updates and the remaining independent migration steps are tracked
in [the dependency upgrade notes](docs/dependency-upgrades.md). Run
`pnpm run lint:check` for ESLint validation without modifying files.

After `pnpm run nest:build`, run `pnpm run test:integration` for local HTTP and
lifecycle checks with simulated vault providers. `pnpm run test:release` checks
stable/prerelease versioning in temporary repositories without publishing.
