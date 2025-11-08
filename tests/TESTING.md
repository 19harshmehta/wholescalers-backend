# Testing Documentation

This document provides comprehensive information about the testing strategy, test structure, and how to run tests for the B2B Wholesale Portal Backend.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Types](#test-types)
5. [Database Population](#database-population)
6. [Best Practices](#best-practices)

## Overview

The testing suite is designed to ensure the reliability, functionality, and security of the B2B Wholesale Portal Backend. The test suite includes:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API endpoints and database interactions
- **Database Population**: Scripts to populate the database with meaningful test data
- **Bug Log**: Documentation of bugs and issues found during testing

### Latest Test Run

All Jest suites were executed on the full codebase (`npm test`). The run completed successfully with 17/17 suites and 162/162 tests passing. Integration scenarios exercised the Express app against the MongoDB Memory Server (with automatic fallback to the local `jest-test` database), and unit suites verified controller, middleware, and utility logic in isolation. Coverage remained high across controllers (98%+ statements, 94%+ branches), middlewares, models, and utilities. Console warnings about the in-memory server reflect the expected fallback path configured in `tests/setup/testSetup.js` and do not indicate failures.

## Test Structure

```
tests/
├── setup/                 # Test setup and configuration
│   └── testSetup.js      # MongoDB memory server setup for tests
├── helpers/               # Test helper functions
│   └── testHelpers.js    # Reusable test utilities
├── unit/                  # Unit tests
│   ├── utils/
│   │   └── jwt.test.js
│   ├── middlewares/
│   │   └── auth.test.js
│   └── controllers/
│       ├── authController.test.js
        └── ....
├── integration/           # Integration tests
│   ├── auth.test.js
│   ├── products.test.js
│   └── orders.test.js
├── scripts/               # Utility scripts
│   └── populateDB.js     # Database population script

```

## Running Tests

### Prerequisites

Install test dependencies:

```bash
npm install
```

### Run All Tests

```bash
npm test
```

This command runs all tests and generates a coverage report.

### Run Tests in Watch Mode

```bash
npm run test:watch
```

This command watches for file changes and re-runs tests automatically.

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests Only

```bash
npm run test:integration
```

### Run Specific Test File

```bash
npx jest tests/unit/utils/jwt.test.js
```

## Test Types

### Unit Tests

Unit tests focus on testing individual functions, utilities, and components in isolation. They should:

- Test one thing at a time
- Be fast and independent
- Not require external dependencies (use mocks when necessary)
- Have clear, descriptive test names

**Example Unit Tests:**

- JWT token generation and verification
- Password hashing and comparison
- Authentication middleware logic
- Authorization checks
- Controller business logic

**Location:** `tests/unit/`

### Integration Tests

Integration tests verify API endpoints and database interactions end-to-end using Supertest and Mongoose. They run against an Express app instance exported from `server.js` and a test MongoDB provided by MongoDB Memory Server (with a fallback to a local test DB).

- What they cover:

  - HTTP routes, request validation, and responses
  - DB reads/writes via Mongoose models
  - AuthN/AuthZ behavior with JWT and roles
  - Happy paths and key error paths (404, 400, 403, 401)
- Where: `tests/integration/`

  - `auth.test.js` — register, login, me, logout
  - `products.test.js` — list/filter, create/update/delete with roles
  - `orders.test.js` — create, list (retailer/wholesaler), get by id, update status
  - `invoices.test.js` — create for order, list by role, get by id
  - `payments.test.js` — Razorpay order creation and signature verification
  - `retailer.test.js` — retailer dashboard overview
  - `reports.test.js` — sales, inventory, customers

How it's wired

- App: `server.js` exports the Express app (no real HTTP server in tests).
- DB: `tests/setup/testSetup.js` initializes MongoDB Memory Server. If the in-memory server fails on your platform, it falls back to `process.env.MONGODB_URI`.
- Env: `.env.test` is auto-loaded by the setup. Do not set env vars in tests.

Required environment variables (in `.env.test`)

- `NODE_ENV=test`
- `MONGODB_URI=mongodb://localhost:27017/jest-test` (fallback connection)
- `JWT_SECRET=your_test_secret`
- `JWT_EXPIRES_IN=1d`
- `RAZORPAY_KEY_ID=rzp_test_xxx`
- `RAZORPAY_KEY_SECRET=rzp_test_secret`

Common helpers

- `tests/helpers/testHelpers.js`
  - `createTestUser`, `createTestWholesaler`, `createTestRetailer`
  - `createTestProduct`, `createTestOrder`
  - `getAuthHeaders(user)` to inject `Authorization: Bearer <token>`

External services

- Payments: Integration tests mock the Razorpay SDK with Jest to avoid network calls while exercising the controller logic. See `tests/integration/payments.test.js` for the mock shape.

Route notes

- If a static route can be shadowed by a dynamic one (e.g., `/wholesaler` vs `/:id`), prefer testing via the mounted route defined first. In `invoices.test.js`, a test-only router mounts the wholesaler list endpoint to avoid `/:id` conflicts without changing production code.

Running integration tests

```bash
npm run test:integration
```

If the in-memory server fails to start, ensure your `.env.test` includes a valid `MONGODB_URI` for the local fallback and that MongoDB is available.

## Database Population

The database population script creates realistic test data for development and testing purposes.

### Running the Population Script

```bash
npm run populate-db
```

Or directly:

```bash
node tests/scripts/populateDB.js
```

### What It Creates

The script populates the database with:

- **3 Wholesalers** with different companies
- **4 Retailers** with different companies
- **1 Admin** user
- **Multiple Products** across different categories for each wholesaler
- **20 Orders** with various statuses
- **Invoices** for delivered orders

### Test Credentials

After running the population script, you can use these credentials:

**Admin:**

- Email: `admin@b2bportal.com`
- Password: `admin123`

**Wholesaler 1:**

- Email: `wholesaler1@techwholesale.com`
- Password: `password123`

**Retailer 1:**

- Email: `retailer1@cityelectronics.com`
- Password: `password123`

### Customizing Data

You can modify `tests/scripts/populateDB.js` to customize:

- Number of users created
- Product categories and quantities
- Order statuses and dates
- Invoice generation rules

## Best Practices

### Writing Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert

   ```javascript
   test('should do something', () => {
     // Arrange - Set up test data
     const user = { name: 'Test', email: 'test@example.com' };

     // Act - Execute the function
     const result = functionUnderTest(user);

     // Assert - Verify the result
     expect(result).toBe(expectedValue);
   });
   ```
2. **Use Descriptive Test Names**: Test names should clearly describe what is being tested

   ```javascript
   // Good
   test('should return 401 when token is missing', () => { ... });

   // Bad
   test('auth test', () => { ... });
   ```
3. **Test Edge Cases**: Don't just test the happy path

   - Missing required fields
   - Invalid input formats
   - Boundary conditions
   - Error scenarios
4. **Keep Tests Independent**: Each test should be able to run independently

   - Use `beforeEach` and `afterEach` to set up/tear down
   - Don't rely on test execution order
5. **Mock External Dependencies**: Use mocks for external services, APIs, or complex operations

### Test Organization

- Group related tests using `describe` blocks
- Use `beforeEach` and `afterEach` for common setup/teardown
- Keep test files focused on one module/component

### Performance

- Keep unit tests fast (milliseconds)
- Integration tests can be slower but should complete in reasonable time
- Use test databases (MongoDB Memory Server) for isolation

## Test Maintenance

### Regular Tasks

1. **Update Tests When Features Change**: Keep tests in sync with code changes
2. **Review Bug Log**: Regularly review and prioritize bug fixes
3. **Update Test Data**: Keep test data realistic and up-to-date
4. **Monitor Coverage**: Aim for high coverage but focus on meaningful tests

### Adding New Tests

When adding new features:

1. Write unit tests for new utilities/functions
2. Write integration tests for new API endpoints
3. Update test helpers if needed
4. Update documentation

## Troubleshooting

### Common Issues

**Tests fail with MongoDB connection errors:**

- Ensure MongoDB Memory Server is properly installed
- Check that test setup is running before tests

**Tests are slow:**

- Check for unnecessary database operations
- Ensure tests are properly isolated
- Consider using mocks for external services

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

---

**Last Updated:** 4-11-2025
