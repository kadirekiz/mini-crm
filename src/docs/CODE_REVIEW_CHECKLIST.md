# Code Review Checklist

## Functionality
- Does it meet the requirement?
- Are edge cases handled?

## API
- Status codes correct?
- Validation present?
- Error format consistent?

## DB / Sequelize
- Migrations included?
- Transactions used where needed?
- No breaking changes without plan?

## Tests
- New logic covered by tests?
- Tests deterministic (no flakiness)?

## Observability
- Useful logs (no sensitive data)?
- requestId present in logs?

## Docs
- README and Swagger updated when needed?
