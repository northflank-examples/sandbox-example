# Northflank Sandbox Example

Quick-start example for spinning up isolated, microVM-backed containers using the Northflank JS SDK. Creates a sandbox with persistent storage, executes a command inside it, and tears it down.

For the full walkthrough and API reference, see the complete documentation we provide separately.

## Requirements

- Node.js >= 18
- A Northflank account
- A Northflank API token (create one at https://app.northflank.com/s/account/settings/api/tokens)
- A Northflank project (create one at https://app.northflank.com/s/account/projects/new)

Your API token needs **Project**, **Services**, and **Volumes** permissions.

## Setup

Install dependencies:

```
npm install
```

Set the required environment variables:

```
export NORTHFLANK_TOKEN=<your-api-token>
export NORTHFLANK_PROJECT_ID=<your-project-id>
```

## Run

```
npm start
```

This will:

1. Create a deployment service with 0 instances (so a volume can be attached first)
2. Create and attach a 10 GiB persistent volume at `/workspace`
3. Scale to 1 instance and wait for it to become ready
4. Execute a command inside the running container via the exec API
5. Delete the sandbox service on completion

## What the script does not cover

- Exposing ports publicly (see the full docs for `apiClient.update.service.ports`)
- Pausing a sandbox (scale to 0 instances instead of deleting)
- Custom container images (swap `ubuntu:22.04` for whatever you need)

## Dependencies

- `@northflank/js-client` -- Northflank JavaScript SDK

## Project structure

```
index.js       -- full sandbox lifecycle script
package.json   -- project config and dependencies
```
