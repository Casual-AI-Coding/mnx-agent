# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-04-03

### Added
- **Workflow System Refactoring** - Unified action node architecture
  - Replace 9 separate node types (TextGenNode, ImageGenNode, VoiceSyncNode, etc.) with single ActionNode
  - ActionConfigPanel component with dynamic service/method selection
  - Service Node Registry singleton for service discovery
  - SaveWorkflowModal for improved workflow saving UX
  - Better error messages for invalid JSON in workflows

- **Management Pages** - New admin functionality
  - ServiceNodeManagement page (super role only) - Manage node permissions
  - WorkflowTemplateManagement page (pro+ role) - Manage workflow templates
  - UserManagement page with filter/sort (role filter, status filter, multi-column sorting)
  - InvitationCodes page with filter/sort (status filter, created/expires/usage sorting)

- **UI/UX Redesign** - Major visual improvements
  - Header redesign: Icon-only controls with tooltips, floating history button (bottom-right)
  - Collapsible sidebar: Toggle between expanded (220px) and collapsed (60px icon-only) modes
  - Premium filter bars with animated filter chips and smooth transitions
  - API Key modal: Centered in entire page viewport
  - Custom scrollbar styles applied globally

### Fixed
- **Layout Stability** - Prevent layout shift from scrollbar behavior
  - Add `scrollbar-gutter: stable` to html element globally
  - Add `overflow-y: scroll` to main content area
  - Remove `overflow-x-auto` from table containers to prevent horizontal scrollbar flickering
  - Fix search input width changing by using fixed `w-[280px]` instead of `flex-1`
  - Filter chips now inline in filter bar instead of separate row

- **Theme Compatibility** - Dark theme text color fixes
  - Add `text-foreground` to Label, Input, Select components
  - Replace hardcoded dark colors (`text-dark-*`, `bg-dark-*`) with theme tokens
  - Reduce hover glow intensity on node cards

- **History Panel** - Button now directly opens panel
  - Remove intermediate dropdown menu
  - Fix z-index issues (HistoryPanel z-40 > Header dropdown z-30)

- **Workflow Engine** - Validation and error handling
  - Validate pagination parameters
  - Add workflow_id validation when creating cron job
  - Replace blocking prompt() with modal dialog

### Security
- **XSS Prevention** - Sanitize mapFunction input in workflow engine
- **Input Validation** - Add validation for workflow pagination and cron workflow_id

### Changed
- **Sidebar** - Reduced width from 260px to 220px, add collapse/expand toggle
- **Workflow Nodes** - Consolidate 9 node types into unified ActionNode
- **Filter Chips** - Moved from separate row to inline in filter bar
- **Sort Controls** - Moved to rightmost position in filter bar
- **Planning Docs** - Reorganized into `docs/planning/` directory structure

### Database
- `migration_012` - Use ALTER TABLE for existing workflow_templates table
- `migration_013` - Change cron_jobs to use workflow_id foreign key

### Documentation
- Add `docs/database-transactions.md` - Transaction requirements documentation
- Add `docs/service-registry.md` - Singleton pattern documentation
- Add `docs/planning/drafts/` - Refactoring planning documents
- Add `docs/planning/archive/` - Archived planning documents

## [1.2.0] - 2026-04-02

### Added
- **Theme System** - Complete theme customization
  - 22 pre-configured themes (11 dark + 11 light)
  - SettingsModal with theme picker UI (animations, gradients, polish)
  - ThemePicker and ThemeCard components
  - useThemeEffect hook for theme application
  - Theme registry system with theme metadata

- **Light Theme Support** - Systematic light theme compatibility
  - All pages updated with semantic CSS tokens
  - Settings page fully styled for light themes
  - Header, Sidebar, HistoryPanel support light themes
  - Shared components (LanguageSwitcher, ShortcutsHelp, etc.) updated

### Fixed
- **Theme System** - UI/UX improvements
  - Settings modal size enlarged (max-w-3xl, max-h-[90vh])
  - Theme picker grid padding for ring-offset visibility
  - Tab hover overlap fixed
  - SystemOption opacity mask removed
  - Settings icon decoration overlap fixed

- **Light Theme Colors** - Systematic color fixes
  - All pages: text-white → text-foreground
  - All pages: text-dark-* → text-muted-foreground
  - All pages: bg-dark-* → bg-card/bg-secondary
  - All pages: border-dark-* → border-border
  - Page h1 titles now use text-foreground for light theme support

### Performance
- **Theme Application** - Media query caching
  - Cached MediaQueryList instance in useThemeEffect

## [1.1.5] - 2026-04-02

### Added
- **Media Management Views** - Three view modes for media files
  - Table view: Traditional table layout (default)
  - Timeline view: Date-grouped list with infinite scroll
  - Card view: Image-based cards with hover overlays
  - Image preview navigation (lightbox multi-image support)
  - Delete success notifications (toast)
  - Token caching to avoid redundant requests
  
- **Audit Logs Enhancement** - Error tracking and usability
  - `error_message` field to capture failure details
  - Copy button for formatted log details
  - Error messages with highlighted styling

- **Developer Tools** - Development workflow improvements
  - `mnx-dev` CLI tool (start/stop/status/log/restart)
  - Background server management
  - Development documentation in AGENTS.md

- **Pagination** - Quick page navigation
  - Page input field for direct page jump
  - Enter key to navigate

- **UI Polish** - Sidebar improvements
  - GitHub link in sidebar footer
  - Fixed bottom bar layout (no overlap)

### Fixed
- **Timeline View Preview** - Image preview showing wrong image
- **JWT Token Verification** - Consistent error handling (throw vs console.error)
- **Number Input** - Remove ugly spinner arrows
- **Batch Delete API** - Change method from POST to DELETE

### Performance
- **Database Optimization** - 90%+ query reduction
  - Fix N+1 query in cron jobs list with JOIN
  - Add pagination to unbounded queries
  - Add missing indexes (execution_logs.status, task_queue.task_type, workflow_templates.name)
  - Replace full table scan with SQL GROUP BY
  - Batch SQL operations for task status updates
  - Combine redundant COUNT queries

- **API Reliability** - 15-20% success rate improvement
  - Retry with exponential backoff for transient failures
  - Webhook rate limiting (100/min)

- **Memory & Rendering** - 95% memory reduction
  - WebSocket heartbeat (30s) and connection limits (1000 max)
  - Balance caching with 30-second TTL
  - Fix O(n²) to O(n) duplicate detection
  - Frontend virtualization with @tanstack/react-virtual
  - Optimize polling with exponential backoff (3s→30s)

### Changed
- **Batch Delete API** - Method changed from POST to DELETE `/api/media/batch`
- **Rate Limiter** - Make auth rate limiter configurable via environment variables
- **Sidebar Layout** - Use flex-col for proper bottom bar positioning

### Database
- `migration_010` - Add performance indexes
- `migration_011` - Add `error_message` TEXT to audit_logs

## [1.1.4] - 2026-04-01

### Added
- **Auth Compatibility** - Complete owner_id support across all routes (#7)
  - Stats routes: Add owner_id filtering via `buildOwnerFilter()`
  - Audit routes: Non-admin users can only see their own audit logs
  - Export routes: Add owner_id filtering for execution logs and media exports
  - DatabaseService: Add `ownerId` parameter to stats methods (`getExecutionStatsOverview`, `getExecutionStatsTrend`, `getExecutionStatsDistribution`, `getExecutionStatsErrors`, `getAuditStats`)

### Fixed
- **Audit Middleware** - Populate `user_id` from JWT token instead of hardcoded `null`

### Changed
- **Data Isolation** - Non-admin users (user/pro) can now only see their own stats and audit logs
- **Documentation** - Add authentication system section to AGENTS.md with role permissions table

## [1.1.3] - 2026-04-01

### Added
- **User Management** - Super admin can manage users (CRUD operations)
  - GET/POST/PATCH/DELETE `/api/users` endpoints with `requireRole(['super'])`
  - User list with search, role badges, status toggle
  - Create user dialog with password hashing (bcrypt)
  - Edit user dialog for role/API key management
  - Delete confirmation with self-delete protection

- **Invitation Code Management** - Super admin can generate invitation codes
  - GET/POST/batch/DELETE `/api/invitation-codes` endpoints
  - Batch generation (1-100 codes) with `crypto.randomBytes`
  - Invitation code list with creator info (JOIN users)
  - Copy-to-clipboard functionality
  - Soft delete via `is_active = false`
  - Expiration support with status badges

- **Sidebar Reorganization** - Collapsible menu sections with localStorage persistence
  - Four categories: 资源管理, 监控统计, 自动化, 系统管理
  - Default expanded: debug console only
  - Role-based visibility (pro+ for most, super only for system management)

### Fixed
- **API URL Prefix** - Remove duplicate `/api` prefix in frontend API calls (#6)

### Changed
- **Sidebar Structure** - Group 11 menu items into 4 collapsible sections for better organization

## [1.1.2] - 2026-04-01

### Added
- **RBAC Data Isolation** - Role-based access control with owner_id (#2)
  - Migration 009: Add `owner_id` columns to all data tables with indexes
  - Data isolation middleware: `buildOwnerFilter()`, `getOwnerIdForInsert()`
  - Admin/super roles see ALL data; user/pro roles see ONLY their own data
  - RoleGuard component for conditional UI rendering
  - Sidebar filtering by role (management pages require pro+)
  - Per-user API key in Settings page

- **Signed Media URLs** - Secure media downloads without JWT (#3)
  - `media-token.ts` for generating/verifying signed tokens (1 hour expiry)
  - `GET /api/media/:id/token` endpoint to generate signed URLs
  - Download endpoint accepts `?token=xxx` query parameter

### Fixed
- **Capacity Monitor 401** - Add JWT Authorization header to capacity API request (#4)
- **SelectItem Hook Violation** - Move `useId()` from `useEffect` to component top level (#5)
- **Select Dropdown Reflow** - Use `createPortal` for floating dropdown, prevent layout shift

### Changed
- **Remove SQLite Support** - Migrate to PostgreSQL only
  - Delete deprecated `schema.ts`, `migrations.ts`, `service.ts`
  - Remove `better-sqlite3` and `@types/better-sqlite3` dependencies
  - Update connection.ts to PostgreSQL-only

### Dependencies
- **Removed** - better-sqlite3, @types/better-sqlite3

### Database
- `migration_009` - Add `owner_id` columns: cron_jobs, media_records, execution_logs, task_queue, workflow_templates, prompt_templates, webhook_configs, dead_letter_queue

## [1.1.1] - 2026-04-01

### Added
- **JWT Authentication System** - Login/register with JWT tokens (#1)
  - Access token (15min) and refresh token (7d)
  - Invitation code required for registration
  - Bootstrap invitation code: `MINIMAX-BOOTSTRAP-2026`
- **RBAC Roles** - Four-level role system: user, pro, admin, super
- **UserService** - Backend service for register, login, password change
- **Login Page** - React Hook Form + Zod validation, invitation code support
- **AuthGuard** - Route guard for protected pages
- **Header User Info** - Username display, role badge, logout button

### Dependencies
- jsonwebtoken - JWT token generation and verification
- bcrypt - Password hashing (cost factor 12)

### Database
- `users` table - User accounts with role, API key, region
- `invitation_codes` table - Invitation code management

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
