# Bitwarden Server Helper

## Development

### Prerequisites

- you should have Docker installed
- configure the ".env" file (copy template from ".env.example")
- run `npm install` to get all needed deps from NPM

### Start app

Once the prerequisites are met, you should:

- run `npm run start:debug`. You can attach nodejs debugger to port 9229.

## Docs

### Update docs

We use Compodoc to automatically generate technical docs from source code. The generation
process must be started manually running the `npm run doc` command from shell. After a succesfull
execution, the generated documentation will be available in "docs/compodoc".

## Test

```bash
# unit tests
npm run test:unit

# unit tests coverage
npm run test:unit:cov

# e2e tests
npm run test:e2e
```

## Useful info

- If you want to import local files in plugins of "nest-cli.json", you must use `.js` files AND
  write a path relative to the "\<repo root\>/node_modules" folder!
