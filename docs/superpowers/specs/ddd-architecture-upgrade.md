# DDD Architecture Upgrade Specification

> Version: 1.0.0  
> Date: 2026-04-06  
> Status: In Progress  
> Author: P8 Architecture Team

## Executive Summary

This document outlines the comprehensive DDD (Domain-Driven Design) architecture upgrade for the mnx-agent project. The upgrade addresses critical architectural issues including God Classes, tight coupling, dependency management, and code organization.

## Problem Analysis

### Critical Issues (P0)

1. **God Class: DatabaseService** (862 lines)
   - Contains 10+ repository instances
   - 50+ public methods spanning all domains
   - Single point of failure, testability nightmare

2. **God Class: WorkflowEngine** (1229 lines)
   - Mixed scheduling and execution logic
   - Static storage pattern
   - Hard to test and extend

3. **Flat Route Structure** (34 files unorganized)
   - No domain-based grouping
   - cron.ts alone is 929 lines
   - Difficult to navigate

4. **8 Global Singletons**
   - getDatabase(), getCronScheduler(), etc.
   - Services create their own dependencies
   - Impossible to mock in tests

### Medium Issues (P1)

1. **Code Duplication**
   - `hasValidApiKey` pattern repeated 8 times
   - Enum definitions duplicated in validation files
   - `buildOwnerFilter` called 15+ times in single file

2. **Hardcoded Configuration**
   - CORS origins hardcoded
   - API hosts not configurable
   - Magic numbers (BCRYPT_ROUNDS=12)

3. **Mixed Store Responsibilities**
   - Frontend stores mix API calls, WebSocket, and UI state
   - No clear separation of concerns

## Solution Architecture

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  Routes → Controllers → DTOs → Application Services          │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                         │
│  Use Cases / Application Services                            │
│  (Orchestration, Transaction Management)                     │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│  Entities, Value Objects, Domain Services, Domain Events     │
│  (Business Logic, Invariants)                                │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                       │
│  Repositories, External Services, Event Bus, DI Container   │
│  (Persistence, Messaging, External APIs)                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Patterns Implemented

1. **Repository Pattern**
   - Generic `RepositoryPort<T>` interface
   - Domain-specific repository ports
   - SQL implementations with PostgreSQL support

2. **Dependency Injection**
   - Lightweight DI container (no external deps)
   - Singleton scope for shared services
   - Factory pattern for transient services

3. **Domain Events**
   - Publish-subscribe event bus
   - Typed domain events
   - Async event handling

4. **Aggregate Roots**
   - Entities with domain events
   - Encapsulated business logic
   - Transaction boundaries

## Implementation Phases

### Phase 0: Infrastructure & Foundation ✅

**Status**: Completed

- ✅ shared-types package structure
- ✅ Infrastructure utilities (timeout, backoff)

### Phase 1: Repository Pattern & DI ⏳

**Status**: In Progress

- ⏳ Repository Port Interfaces (3 agents working)
- ⏳ DI Container implementation
- 📝 SQL Repository implementations

### Phase 2: Domain Services & Events 📋

**Status**: Pending

- ⏳ Domain Event Bus (1 agent working)
- 📝 Refactor WorkflowEngine to Strategy Pattern
- 📝 Extract business logic from routes

### Phase 3: Configuration & Validation 📋

**Status**: Pending

- 📝 Centralize configuration
- 📝 Consolidate validation schemas
- 📝 Create configuration types

### Phase 4: Frontend Refactoring 📋

**Status**: Pending

- 📝 Split God Components (WorkflowBuilder, CronManagement)
- 📝 Separate domain state from UI state
- 📝 Implement React Query for data fetching

## Success Criteria

### Functional Requirements

- [ ] All existing features continue to work
- [ ] No breaking API changes
- [ ] All tests pass
- [ ] TypeScript compiles without errors

### Non-Functional Requirements

- [ ] Build time < 30 seconds
- [ ] Test suite execution < 60 seconds
- [ ] No circular dependencies
- [ ] Code coverage > 70%

### Architecture Quality Metrics

- [ ] No God Classes (max 300 lines per file)
- [ ] Dependency injection for all services
- [ ] Repository pattern for all data access
- [ ] Clear domain boundaries

## Risk Mitigation

### Identified Risks

1. **Breaking Changes**
   - Mitigation: Incremental refactoring with tests
   - Rollback: Git commits per phase

2. **Performance Regression**
   - Mitigation: Benchmark before/after
   - Monitoring: Track response times

3. **Team Adoption**
   - Mitigation: Document patterns
   - Training: Code review process

### Rollback Strategy

Each phase is independently deployable:
- Phase 0: Can be reverted independently
- Phase 1: DI container is additive, no breaking changes
- Phase 2: Event bus is additive, no breaking changes
- Phase 3: Configuration changes are backward compatible

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 0 | 2 days | 2026-04-04 | 2026-04-05 |
| Phase 1 | 3 days | 2026-04-06 | 2026-04-08 |
| Phase 2 | 3 days | 2026-04-09 | 2026-04-11 |
| Phase 3 | 2 days | 2026-04-12 | 2026-04-13 |
| Phase 4 | 3 days | 2026-04-14 | 2026-04-16 |

**Total Duration**: 13 days

## References

- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)
- [Sairyss/domain-driven-hexagon](https://github.com/Sairyss/domain-driven-hexagon)
- [Implementing Domain-Driven Design](https://vaughnvernon.com/?page_id=168)

---

**Next Steps**: Complete Phase 1 implementation with parallel agent execution