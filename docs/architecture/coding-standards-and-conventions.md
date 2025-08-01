# Coding Standards and Conventions

## Existing Standards Compliance
**Code Style:** C++ follows Visual Studio defaults, TypeScript uses basic ESLint configuration
**Linting Rules:** Minimal linting currently in place, no automated enforcement
**Testing Patterns:** Limited unit testing, no integration or end-to-end testing
**Documentation Style:** Inline comments, README files, no API documentation

## Enhancement-Specific Standards
- **API Documentation:** OpenAPI 3.0 specifications for all REST endpoints
- **Container Standards:** Multi-stage Docker builds, security scanning, minimal base images
- **Microservice Patterns:** Health checks, graceful shutdown, circuit breakers
- **Security Standards:** Input validation, secure secret management, audit logging

## Critical Integration Rules
- **Existing API Compatibility:** All existing COM interface methods must remain functional with identical signatures
- **Database Integration:** All database operations must include rollback capability and transaction management
- **Error Handling:** Maintain existing error message formats for backward compatibility while enhancing error details
- **Logging Consistency:** Preserve existing log formats while adding structured logging for new components
