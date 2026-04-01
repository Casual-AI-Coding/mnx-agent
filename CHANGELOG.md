# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-04-01

### Added
- **PostgreSQL Support** - Migrate from SQLite to PostgreSQL with async API
  - Connection pooling with timeout, keepAlive, and error recovery
  - Async database service with full CRUD operations
  - Migration system for PostgreSQL schema
  - Data migration script from SQLite to PostgreSQL
- **Onboarding Experience** - WelcomeModal with QuickStartGuide for new users
- **Batch Media Operations** - Select multiple media records for batch delete/download
- **Workflow Templates API** - CRUD endpoints for workflow templates management
- **Select Keyboard Navigation** - Arrow keys, Enter, Escape support in Select component
- **Select Size Variants** - CVA variants for `sm`, `md`, `lg` sizes

### Fixed
- **Audit Logs** - Skip GET requests from logging, only record operation types (POST/PUT/PATCH/DELETE)
- **Audit Logs Detail** - Handle object type `request_body` rendering gracefully
- **Audit Stats** - Fix `avg_duration_ms` field name mismatch with backend
- **Workflow Engine** - Fix loop node result accumulation
- **API Clients** - Use `internalAxios` for `/api` routes to skip rate limiting
- **Select Component** - Handle edge cases with proper null checks

### Changed
- **Audit Logs UI** - Styled filter buttons instead of native select, add duration/time columns
- **Template Creation Modal** - Redesigned with gradient header and custom dropdown
- **VideoAgent Thumbnails** - Themed icons with gradient backgrounds
- **Backend Architecture** - All routes and services converted to async/await pattern
- **Database Layer** - New async service replaces sync SQLite operations

### Performance
- **PostgreSQL Connection Pool** - Efficient connection management with pg pool
- **API Retry Logic** - Automatic retry for 429/503 errors with exponential backoff

### Dependencies
- **Added** - pg (PostgreSQL client)

### Tests
- Add tests for WorkflowEngine, Workflows API, BatchOperations, Select component
- Add tests for CreateTemplateModal, WelcomeModal, QuickStartGuide

### Documentation
- Add `docs/sqlite-to-postgres-migration.md` - Comprehensive migration guide
- Update `AGENTS.md` - Add PostgreSQL connection abstraction documentation

## [1.0.2] - 2026-04-01

### Added
- **Template System** - Prompt template CRUD with variable substitution, category filtering
- **Audit Logs** - All API operations logged with sensitive data redaction (passwords, tokens, apiKeys)
- **Stats Dashboard** - Execution stats overview, success rate trends, task distribution, error ranking
- **Structured Logging** - pino logger with file output and pretty printing, configurable levels
- **UI Components** - Dialog, EmptyState, Tooltip components for consistent UI patterns
- **Data Export** - Execution logs and media records export to CSV/JSON with date filtering
- **Batch Operations** - Media record batch delete and download support

### Fixed
- **Export Pagination** - Use SQL LIMIT/OFFSET instead of in-memory filtering for large datasets
- **Audit Middleware** - Add fallback file logging when database write fails, ensure response always completes
- **Stats Route** - Move db initialization to handler to avoid race condition with service startup
- **Logger Request ID** - Use uuid instead of Math.random() for cryptographically secure correlation IDs
- **Logger Initialization** - Lazy initialization to avoid using default config before setup
- **Audit Query Validation** - Add Zod validation schema for audit log endpoints
- **Template Route** - Cache Number() conversions to avoid repeated calls

### Changed
- **CSV Export** - Extract shared `toCSV` utility to eliminate code duplication between log and media export
- **Template Library** - Replace window.confirm with custom Dialog component for better UX

### Performance
- **Database** - New `getExecutionLogsPaginated` method with proper SQL pagination

### Dependencies
- **Added** - pino, pino-pretty, uuid
- **Updated** - zod to v4.3.6

## [1.0.1] - 2026-04-01

### Fixed
- **WebSocket Infrastructure** - `initCronWebSocket()` now called in server startup, events properly emitted
- **Workflow Node Types** - Composite types (text-generation, voice-sync, etc.) now correctly handled in DAG execution
- **Error Handling** - Centralized `asyncHandler` middleware, axios interceptor preserves MiniMax error codes

### Performance
- **Database** - Migration 4 adds 5 indexes, 12 N+1 queries fixed with SQLite RETURNING clause
- **React** - Dashboard memoization (useMemo/useCallback), React.memo on CronManagement children
- **Build** - Code splitting with 45 chunks (vendor 346KB, flow 183KB, animation 129KB, ui 54KB)

### Added
- **WebSocket Client** - Frontend `ReconnectingWebSocket` with auto-reconnect, heartbeat, typed message handlers
- **Unit Tests** - 74 new tests for TaskExecutor (94%), CapacityChecker (98%), WebSocketService
- **i18n** - 3 pages fixed (VoiceSync, MusicGeneration, VideoGeneration) with proper translation keys
- **MiniMax API Features** - Prompt caching toggle for text generation, 15 camera commands for video generation

### Changed
- **Routes** - All use centralized `asyncHandler` from `server/middleware/asyncHandler.ts`
- **Frontend Architecture** - All 17 routes use React.lazy() for code splitting with ErrorBoundary

## [1.0.0] - 2026-03-31

### Added
- **AI Capabilities**
  - Text generation (sync/stream) with abab5.5-chat model
  - Voice synthesis (sync/async) with speech-01 model
  - Voice cloning and management
  - Image generation with image-01 model (1-9 images at once)
  - Music generation with music-2.5 model
  - Video generation with video-01 model
  - Video Agent with 6 templates

- **Cron System**
  - Standard cron expression scheduling
  - Timezone support
  - Job management (CRUD, toggle, run, clone)
  - Task queue with FIFO/priority strategies
  - Execution logs with details
  - Webhook notifications with HMAC signing
  - Dead letter queue for failed tasks

- **Workflow Engine**
  - DAG execution with topological sort
  - Node types: action, condition, transform, loop, queue
  - Template string resolution
  - Retry logic with exponential backoff

- **Media Management System**
  - Database schema for `media_records` table
  - Backend API routes for CRUD operations
  - File upload and download endpoints
  - Frontend MediaManagement page with tabs, search, pagination
  - Image thumbnails in list view
  - Lightbox preview for images
  - Integration with all generation pages (Voice, Image, Video, Music)
  - Backend proxy for image upload to bypass CORS

- **Monitoring**
  - Capacity tracking for API quotas
  - WebSocket real-time updates
  - Health check endpoint

### Fixed
- **Rate Limiting** - Skip rate limit for internal service routes (`/api/media`, `/api/files`, `/api/cron`)
- **Database Migration** - Add `migration_005_media_records` for existing databases
- **Tab Switching** - Smooth opacity transition instead of loading flash
- **Image Preview** - Use correct API URL for Lightbox preview
- **Memory Leaks** - Add setInterval cleanup in VideoAgent and VoiceAsync
- **Error Handling** - Add ERR_NO_READER fallback in text.ts
- **React Context** - Add ErrorBoundary wrapper for Tabs/Select components

### Changed
- **Placeholder APIs** - Replace with real backend connections in taskQueue and executionLogs stores
- **Console Logging** - Remove 23+ production console.log statements

### Tests
- Add 427+ tests across backend services and frontend stores
  - WorkflowEngine: 68 tests (topological sort, node execution)
  - QueueProcessor: 33 tests (retry logic, dead letter queue)
  - CronScheduler: 28 tests (scheduling, concurrent limits)
  - DatabaseService: 107 tests (CRUD operations)
  - Zustand stores: 78 tests
  - API modules: 102 tests

### Technical
- Express backend with TypeScript
- Better SQLite3 database
- React 18 frontend
- Tailwind CSS styling
- Zustand state management
- React Router navigation
- Vitest testing framework
