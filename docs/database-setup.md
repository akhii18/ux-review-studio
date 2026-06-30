# Database Setup Guide

This guide matches the real workflow for this repo.

Branch flow:

- feature branches merge into `develop`
- `develop` is the integration branch for review and testing
- `main` is the release branch
- pushes to `main` deploy to Azure

Database flow:

- each developer uses their own local PostgreSQL database
- production uses one Azure Database for PostgreSQL server
- Prisma migrations are the source of truth
- `db push` is not part of the shared workflow
- Azure App Service does not run migrations at startup

Do not treat this as a theory page. Follow it in order.

## 0. What you are building

You will end up with:

- one local PostgreSQL database per developer machine
- one Azure PostgreSQL production database
- migration files committed to the repo
- feature branches reviewed through `develop`
- production deploys triggered from `main`

This is the normal setup when you want developers to move freely without breaking production schema.

## 1. The exact branch and release flow

Use this flow every time.

### 1.1 Feature work

1. Create a feature branch from `develop`.
2. Make your code change.
3. If the schema changes, create a Prisma migration locally.
4. Commit the code and the migration together.
5. Open the pull request into `develop`.

What to do after this step:

- keep feature work isolated on the branch
- do not point the feature branch at production database credentials

### 1.2 Integration on `develop`

1. Merge the feature PR into `develop`.
2. Use `develop` for code review, testing, and integration.
3. Keep `develop` on local or non-production data until release time.

What to do after this step:

- confirm the code works in the branch that collects features
- do not let `develop` become your live production database target

### 1.3 Release from `main`

1. When `develop` is ready, open a PR from `develop` into `main`.
2. Before the `main` merge or immediately before deployment, apply the production database migration.
3. Merge to `main`.
4. GitHub Actions deploys the app from `main`.

What to do after this step:

- treat `main` as the release point
- do not rely on Azure App Service startup to apply migrations

## 2. The database layout I recommend

Use two databases now:

- local PostgreSQL on each developer machine
- one Azure PostgreSQL production database

Later, if you want more safety, add a third staging database. You do not need staging to start cleanly.

What to do after this step:

- keep local and production separate
- do not share a production database with feature branches

## 3. Set up the Azure production database

Do this first.

### 3.1 Open the Azure portal

1. Go to the [Azure portal](https://portal.azure.com).
2. Sign in with the correct subscription account.
3. Make sure you are in the right subscription before creating resources.

What to do after this step:

- verify the subscription name before creating anything
- do not build resources in the wrong tenant

### 3.2 Create Azure Database for PostgreSQL

1. Select **Create a resource**.
2. Search for **Azure Database for PostgreSQL flexible server**.
3. Select **Create**.
4. On the **Basics** tab, fill in:
   - your subscription
   - a resource group such as `uxm-prod-rg`
   - a server name such as `uxm-postgres-prod`
   - the region closest to your Azure App Service
   - a PostgreSQL version supported by Azure
   - admin username and password

What to do after this step:

- save the admin credentials somewhere safe
- do not commit them to the repo

### 3.3 Pick the compute size

1. Start with a small production-safe size.
2. Keep the first version simple.
3. You can scale later if traffic grows.

What to do after this step:

- choose the smallest useful size
- avoid overpaying before the app is live

### 3.4 Configure networking

1. Allow public access for the first setup if that is easiest.
2. Enable SSL enforcement.
3. Add firewall rules for your local machine if you need to run migrations from it.

What to do after this step:

- make sure secure connections are required
- make sure your machine can reach the database when needed

### 3.5 Create the production database

1. Inside the PostgreSQL server, create a database such as `uxm_prod`.
2. Start from a fresh empty database.
3. Do not import old Supabase data unless you truly need it.

What to do after this step:

- confirm the database exists
- treat this as the production schema target

### 3.6 Copy the connection strings

Build these two values from the Azure server details:

```text
DATABASE_URL=postgresql://<user>:<password>@<server-name>.postgres.database.azure.com:5432/uxm_prod?sslmode=require
DIRECT_URL=postgresql://<user>:<password>@<server-name>.postgres.database.azure.com:5432/uxm_prod?sslmode=require
```

What to do after this step:

- keep `sslmode=require`
- test the values before you go further

## 4. Set up local PostgreSQL on each machine

Do not use Docker.

Install PostgreSQL directly on each developer machine and create a local database for this app.

### 4.1 Install PostgreSQL locally

1. Install PostgreSQL using the native installer for your OS.
2. Make sure the PostgreSQL service is running.
3. Confirm you can connect with a normal database client.

What to do after this step:

- verify PostgreSQL is installed and running
- note the port if you are not using `5432`

### 4.2 Create the local database

1. Create a local database such as `uxm_copilot`.
2. Create a local user if you want one, or use your local admin user.
3. Give that user access to the database.

Suggested local connection strings:

```text
DATABASE_URL=postgresql://uxm:uxm_local_secret@localhost:5432/uxm_copilot?sslmode=disable
DIRECT_URL=postgresql://uxm:uxm_local_secret@localhost:5432/uxm_copilot?sslmode=disable
```

What to do after this step:

- keep local credentials separate from production
- never point your laptop at the production database by default

## 5. Update the repo files

Now make the codebase match the workflow.

### 5.1 Update the env example files

Edit these files:

- [apps/api/.env.example](apps/api/.env.example)
- [.env.example](.env.example)

They should use placeholder PostgreSQL values, not real credentials.

Use this pattern:

```text
DATABASE_URL="postgresql://<user>:<password>@<server-name>.postgres.database.azure.com:5432/<database>?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<server-name>.postgres.database.azure.com:5432/<database>?sslmode=require"
```

What to do after this step:

- keep the example files generic
- do not store live passwords in example files

### 5.2 Fill in your local env files

Set up your local files like this:

```text
# apps/api/.env
DATABASE_URL=postgresql://uxm:uxm_local_secret@localhost:5432/uxm_copilot?sslmode=disable
DIRECT_URL=postgresql://uxm:uxm_local_secret@localhost:5432/uxm_copilot?sslmode=disable
PORT=4000
NODE_ENV=development
JWT_SECRET=replace-with-a-strong-random-secret
CORS_ORIGIN=http://localhost:3000
WEB_APP_URL=http://localhost:3000
```

```text
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

What to do after this step:

- keep local env files pointed at local Postgres
- keep production credentials out of local files

### 5.3 Keep the API scripts as the database commands

Open [apps/api/package.json](apps/api/package.json).

Use these commands:

- `npm run db:migrate` for local migration creation
- `npm run db:migrate:prod` for production migration deploys
- `npm run db:generate` for Prisma client generation
- `npm run db:seed` for local seed data

What to do after this step:

- do not use `db push` for shared environments
- do not make the app service apply schema changes at boot

### 5.4 Keep the App Service startup command simple

The API App Service should only start the compiled API.

Use this command:

```text
npm run start:prod --workspace @uxm/api
```

What to do after this step:

- keep startup separate from migrations
- do not hide database changes in the app boot process

## 6. Create and apply a local migration

This is the basic schema change workflow for feature branches.

### 6.1 Change the Prisma schema

Open [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma).

Make your model changes there first.

What to do after this step:

- keep schema changes in Prisma
- do not edit production tables by hand first

### 6.2 Generate the migration locally

1. Open a terminal.
2. Go to the API package:

```bash
cd apps/api
```

3. Create the migration:

```bash
npm run db:migrate -- --name <meaningful_name>
```

4. Prisma will create files under [apps/api/prisma/migrations](apps/api/prisma/migrations).
5. Prisma will also apply the migration to your local database.

What to do after this step:

- confirm the migration folder exists
- confirm the local tables changed the way you expected
- commit the migration files with the code

### 6.3 Seed local data if needed

If you need test data, run:

```bash
npm run db:seed
```

What to do after this step:

- keep seed data small
- make sure seeds are safe to rerun

## 7. Release to production on `main`

This is the part that matters for GitHub.

### 7.1 Finish the PR into `develop`

1. Work on your feature branch.
2. Merge the feature PR into `develop`.
3. Keep integrating until `develop` is ready for release.

What to do after this step:

- verify the feature on `develop`
- do not merge schema changes into `main` until the production migration is ready

### 7.2 Apply the production migration

Before merging `develop` into `main`, run the production migration once.

1. Put the Azure production `DATABASE_URL` and `DIRECT_URL` into your shell or env file.
2. Go to the API package:

```bash
cd apps/api
```

3. Run:

```bash
npm run db:migrate:prod
```

What to do after this step:

- wait until the migration succeeds
- do not merge to `main` until Azure has the new schema

### 7.3 Merge `develop` into `main`

1. Open a pull request from `develop` to `main`.
2. Merge it only after the production database is ready.
3. Push to `main`.

GitHub Actions will then deploy the app because the workflow is set to deploy on push to `main`.

What to do after this step:

- confirm the workflow runs on `main`
- confirm the deployment completes successfully

### 7.4 Smoke test production

1. Open the production app URL.
2. Start a review.
3. Make sure the app can read and write the Azure database.

What to do after this step:

- verify the release end to end
- do not assume deployment success means the schema is correct

## 8. The exact schema workflow for future PRs

Use this every time someone changes the database schema.

1. Change [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma).
2. Run `npm run db:migrate -- --name <meaningful_name>` in [apps/api](apps/api).
3. Test the app locally.
4. Commit the migration files and code.
5. Merge the feature branch into `develop`.
6. When `develop` is ready, run `npm run db:migrate:prod` against Azure.
7. Merge `develop` into `main`.
8. Let GitHub Actions deploy from `main`.

What to do after this step:

- every schema PR should carry the migration files
- no one should be using `db push` on shared databases
- only one release step should touch production schema

## 9. What the App Service should and should not do

### Should do

- start the compiled API
- serve production traffic
- read the production environment variables

### Should not do

- run Prisma migrations at startup
- run `db push`
- change the production schema automatically

The startup command should stay boring.

## 10. What not to do

- Do not point every developer at the production database.
- Do not use `db push` for the shared workflow.
- Do not let App Service manage migrations.
- Do not keep real secrets in example files.
- Do not use Docker if that is not your workflow.

## 11. What happens next

After this guide is followed:

- local developers work independently on their own database
- `develop` stays a review branch, not a shared DB branch
- `main` deploys only after the production schema is ready
- production stops breaking because of schema drift

If you want a later upgrade, add a separate Azure staging database and a GitHub Actions migration job before production deploys.