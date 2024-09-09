# Bitwarden Server Helper

## Installation

You can run this software via Docker:

```bash
docker run marcuson/bw-server-helper
```

## Configuration

You can configure the way the app works with the following env vars:

| Env var              | Default value           | Notes                                                                                                                                                                |
| -------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API_ENABLED          | `true`                  | Whether the API is enabled or not. **Note**: the API is not authenticated and you **should** provide an external authentication mechanism if exposing this publicly! |
| BACKUP_MAX_NUM       | `30`                    | Maximum number of most recent backups to keep.                                                                                                                       |
| BW_CLIENTID          | -                       | **Required**. Client id of your user in your Bitwarden instance.                                                                                                     |
| BW_CLIENTSECRET      | -                       | **Required**. Client secret of your user in your Bitwarden instance.                                                                                                 |
| BW_SAFE_PASSWORD     | -                       | **Required**. Password of your Bitwarden safe.                                                                                                                       |
| BW_SERVER_URL        | `https://bitwarden.com` | URL of the server where you Bitwarden instance is. Use `https://bitwarden.com` for America, `https://bitwarden.eu` for Europe or insert your self-hosted URL.        |
| DATA_DIR             | `/bwsh/data`            | Location where Bitwarden Server Helper related data will be stored. It should be persistent (mount a volume or local directory to this path).                        |
| IP_BIND              | `0.0.0.0`               | IP where to bind the web server for API.                                                                                                                             |
| LOG_LEVEL            | `info`                  | Max log level to be shown.                                                                                                                                           |
| PORT                 | `3000`                  | Bind port of API.                                                                                                                                                    |
| SCHEDULE_ENABLED     | `false`                 | Whether the scheduled actions are enabled or not.                                                                                                                    |
| SCHEDULE_BACKUP_CRON | `0 0 \* \* \*`          | The cron expression for automated backups. Pass an empty string to disable this specific task.                                                                       |
| NODE_ENV             | `production`            | The Node environment used for libraries like Express. Suggested to leave as per default.                                                                             |
| TZ                   | `Europe/Rome`           | The timezone used for schedules.                                                                                                                                     |

## Development

### Prerequisites

- you should have Docker installed
- configure the ".env" file (copy template from ".env.example")
- run `npm install` to get all needed deps from NPM

### Start app

Once the prerequisites are met, you should:

- run `npm run start:debug`. You can attach nodejs debugger to port 9229.

### Docs

We use Compodoc to automatically generate technical docs from source code. The generation
process must be started manually running the `npm run doc` command from shell. After a succesfull
execution, the generated documentation will be available in "docs/compodoc".

### Test

```bash
# unit tests
npm run test:unit

# unit tests coverage
npm run test:unit:cov

# e2e tests
npm run test:e2e
```

### Useful dev info

- If you want to import local files in plugins of "nest-cli.json", you must use `.js` files AND
  write a path relative to the "\<repo root\>/node_modules" folder!
