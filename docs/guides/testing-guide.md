# Testing Environment Setup

This document describes how to set up the testing environment for the mnx-agent project.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

## Environment Configuration

### 1. Create `.env` File

Copy the example environment file and configure your database credentials:

```bash
cp .env.example .env
```

### 2. Required Environment Variables

Ensure your `.env` file contains these database configuration variables:

```env
# Database Configuration
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=mnx_agent
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
```

### 3. PostgreSQL Setup

Create the database and user:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE mnx_agent;

-- Create user with password
CREATE USER your_database_user WITH PASSWORD 'your_database_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mnx_agent TO your_database_user;

-- Connect to the database
\c mnx_agent

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO your_database_user;
```

### 4. Run Migrations

Migrations are automatically run when the server starts. To run them manually:

```bash
npm run server
```

Or for development:

```bash
npm run dev:full
```

## Running Tests

### All Tests

```bash
npm test
```

### Frontend Tests (Parallel)

```bash
npm test
# Frontend tests run in parallel (fileParallelism: true, maxWorkers: 8)
```

### Backend Tests (Sequential)

```bash
npm run test:server
# Backend tests run sequentially to avoid database state conflicts
```

### With Coverage

```bash
npm run test:coverage
# Runs both frontend and backend tests with coverage
```

### Specific Test File

```bash
npx vitest run server/__tests__/database-service.test.ts
# or
vitest run src/components/__tests__/Button.test.tsx
```

### Watch Mode

```bash
npm run test:watch
```

### Test Commands Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests (frontend + backend) |
| `npm run test:server` | Run backend tests only |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run all tests with coverage report |
| `vitest run <path>` | Run specific test file |

## Test Structure

### Setup Files

The project uses two setup files configured in `vitest.config.ts`:

1. **`server/__tests__/setup.ts`** - Loads `.env` file for PostgreSQL connection
2. **`src/__tests__/setup.ts`** - Configures testing-library for React components

### Test Categories

| Directory | Purpose |
|-----------|---------|
| `server/__tests__/` | Backend unit tests |
| `server/**/__tests__/` | Backend service tests |
| `src/__tests__/` | Frontend unit tests |
| `src/**/__tests__/` | Frontend component tests |

## Common Issues

### PostgreSQL Connection Errors

**Error**: `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`

**Solution**: 
- Ensure `.env` file exists in project root
- Verify `DB_PASSWORD` is set and not empty
- Check that `server/__tests__/setup.ts` is being loaded (check `vitest.config.ts`)

### Database Permission Errors

**Error**: `permission denied for schema public`

**Solution**:
```sql
GRANT ALL ON SCHEMA public TO your_database_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_database_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_database_user;
```

### Migration Errors

**Error**: `relation "users" does not exist`

**Solution**: Run the server to apply migrations, or manually run migration SQL files.

## Test Accounts

The `.env` file includes test accounts for different roles:

```env
TEST_SUPER_USER=TestSuper
TEST_SUPER_PASS=Tf09dsfhs
TEST_ADMIN_USER=TestAdmin
TEST_ADMIN_PASS=Tf09dsfhs
TEST_PRO_USER=TestPro
TEST_PRO_PASS=Tf09dsfhs
TEST_USER_USER=TestUser
TEST_USER_PASS=Tf09dsfhs
```

These accounts are created automatically by the migration system.

## CI/CD Integration

For CI/CD pipelines, ensure:

1. PostgreSQL service is running
2. Environment variables are set in CI configuration
3. Migrations run before tests

Example GitHub Actions configuration:

```yaml
services:
  postgres:
    image: postgres:14
    env:
      POSTGRES_USER: mnx_agent_test
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: mnx_agent_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '18'
  - run: npm ci
  - run: npm test
    env:
      DB_HOST: localhost
      DB_PORT: 5432
      DB_USER: mnx_agent_test
      DB_PASSWORD: test_password
      DB_NAME: mnx_agent_test
```

## Debugging Tests

### Verbose Output

```bash
vitest run --reporter=verbose
```

### Debug Single Test

```bash
vitest run -t "test name pattern"
```

### Console Output

Tests use the project's logger. Check console output for:
- Database connection status
- Query execution details
- Error messages with stack traces

## Test Database Configuration

### CRITICAL: Use Separate Test Database

**⚠️ NEVER run tests against the production database!**

Tests that use `beforeEach` to clear data will permanently delete production records.

### Setup Test Database

1. **Create a separate test database:**
   ```bash
   # Using createdb
   createdb -U postgres mnx_agent_test
   
   # Or using psql
   psql -U postgres -c "CREATE DATABASE mnx_agent_test;"
   ```

2. **Create `.env.test` file (recommended):**
   ```env
   # Test database - NEVER use production database!
   DB_TEST_NAME=mnx_agent_test
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   ```

3. **Test configuration is automatically loaded:**
   - Tests use `{DB_NAME}_test` by default
   - Or `DB_TEST_NAME` if specified in `.env.test`
   - See `server/__tests__/test-helpers.ts` for implementation

### Database Safety Rules

1. **NEVER use production database for tests**
   - Tests clear tables in `beforeEach` hooks
   - This will permanently delete production data
   
2. **Always verify test database name**
   - Check `DB_NAME` ends with `_test`
   - Or use `DB_TEST_NAME` environment variable
   
3. **Tests that modify data must:**
   - Use test database (automatic with `test-helpers.ts`)
   - Clean up after themselves
   - Not rely on production data

### Migrating Existing Tests

If you have tests that hardcode database connections, update them:

```typescript
// ❌ WRONG - Uses production database
beforeAll(async () => {
  await createConnection({
    pgDatabase: process.env.DB_NAME || 'mnx_agent',  // Production!
  })
})

// ✅ CORRECT - Uses test database
import { getTestDbConfig, setupTestDatabase } from '../test-helpers.js'

beforeAll(async () => {
  await setupTestDatabase()  // Uses test database
})
```

## Best Practices

1. **Test Isolation**: Backend tests run sequentially (`fileParallelism: false`) to avoid database state conflicts. Frontend tests run in parallel since they are stateless.

2. **Transactions for Future Isolation**: The `withTransaction()` helper is available for when we enable parallel backend tests:

   ```typescript
   import { withTransaction } from '../__tests__/test-helpers.js'

   it('should create media record', async () => {
     await withTransaction(async (tx) => {
       await tx.execute('INSERT INTO media_records ...')
       const result = await tx.query('SELECT * FROM media_records')
       expect(result.length).toBe(1)
     })
   })
   ```

3. **Cleanup**: If not using `withTransaction`, each test should clean up its data in `afterEach`

4. **Mocks**: Use mocks for external services (MiniMax API)

5. **Fixtures**: Create reusable test fixtures in `__fixtures__/` directories

6. **Naming**: Use descriptive test names: `should [expected behavior] when [condition]`

7. **Test Database**: ALWAYS use separate test database - never production

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)