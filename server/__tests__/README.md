# Test Suite for Migrated Session

This directory contains tests for the migrated session fixture and migration system.

## Test Files

- **`migrated-session.fixture.test.js`** - Tests the migrated session as a fixture
  - Schema validation
  - Data integrity checks
  - Storage integration
  - Usage scenarios
  - Edge cases

- **`migration.integration.test.js`** - Integration tests for the migration system
  - Legacy format detection
  - Migration execution
  - Validation
  - Data preservation
  - Storage integration

## Running Tests

### Using Jest (Recommended)

```bash
cd server
npm test
```

### Using Node Test Runner (Node 18+)

```bash
cd server
node --test __tests__/*.test.js
```

## Test Coverage

The tests verify:

1. **Schema Compliance**: All fields match `PokemonSessionSchema`
2. **Data Integrity**: References between objects are valid
3. **Migration Accuracy**: Legacy data is correctly transformed
4. **Storage Compatibility**: Sessions can be saved and loaded
5. **Usage Scenarios**: Fixture works for agent operations

## Fixtures

Tests use these fixtures:
- `legacy-session-example.json` - Original legacy format session
- `migrated-legacy-session.json` - Migrated schema-compliant session

## Expected Results

All tests should pass, confirming:
- ✅ Migrated session is 100% schema-compliant
- ✅ All required fields are present
- ✅ Data transformations are correct
- ✅ Session can be used in production
