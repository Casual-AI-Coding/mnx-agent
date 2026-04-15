# Frontend Component Splitting Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split 12 large frontend files (>500 lines) into smaller, focused modules while preserving all functionality

**Architecture:** Split strategy focuses on extracting:
- Nested components (modals, cards, list items) into separate files
- Helper functions and utility hooks into dedicated modules  
- Type definitions into shared types files
- Large data/constants into separate data files

**Tech Stack:** React 18, TypeScript, Tailwind CSS

---

## Overview

| File | Current Lines | Target Files | Target Lines Each |
|------|---------------|--------------|-------------------|
| `src/data/workflow-templates.ts` | 982 | 3 | ~330 avg |
| `src/pages/DeadLetterQueue.tsx` | 938 | 6 | ~156 avg |
| `src/pages/InvitationCodes.tsx` | 774 | 4 | ~193 avg |
| `src/pages/WebhookManagement.tsx` | 765 | 4 | ~191 avg |
| `src/pages/VoiceAsync.tsx` | 965 | 6 | ~160 avg |
| `src/pages/VoiceSync.tsx` | 733 | 4 | ~183 avg |
| `src/pages/UserManagement/useUserManagement.ts` | 599 | 3 | ~200 avg |
| `src/components/ui/Select.tsx` | 596 | 4 | ~149 avg |
| `src/pages/WorkflowMarketplace.tsx` | 558 | 4 | ~139 avg |
| `src/pages/ServiceNodeManagement.tsx` | 523 | 4 | ~130 avg |
| `src/pages/WorkflowBuilder.tsx` | 494 | 2 | ~247 avg |
| `src/components/workflow/config-panels/ActionConfigPanel.tsx` | 488 | 3 | ~162 avg |

---

## Implementation Order

Dependencies between files (split in this order):

1. **Phase 1:** Type definitions and utilities (no dependencies)
2. **Phase 2:** UI components (depend on types)
3. **Phase 3:** Page components (depend on UI components)
4. **Phase 4:** Data files (pure data, no dependencies)

---

## Phase 1: Type Definitions and Utilities

### Task 1: Split `src/data/workflow-templates.ts`

**Current:** 982 lines (types + data + helper functions)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/data/workflow-templates/types.ts` | All type definitions (`WorkflowNode`, `WorkflowEdge`, `WorkflowTemplate`, `TemplateCategory`, `TemplateCategoryInfo`) | ~70 |
| `src/data/workflow-templates/constants.ts` | `TEMPLATE_CATEGORIES` constant | ~15 |
| `src/data/workflow-templates/index.ts` | Re-exports + helper functions (`getTemplatesByCategory`, `searchTemplates`, `getTemplateById`, `getAllCategories`) + `BUILTIN_TEMPLATES` data | ~897 |

**Note:** The template DATA is inherently large (8 template objects with full node/edge definitions). No need to split further - 897 lines of data is acceptable. The types/constants separation provides better IDE support.

**Files to create:**
- Create: `src/data/workflow-templates/types.ts`
- Create: `src/data/workflow-templates/constants.ts`
- Modify: `src/data/workflow-templates/index.ts` (keep only re-exports and data)

**Import updates required in:**
- `src/pages/WorkflowMarketplace.tsx`

---

### Task 2: Split `src/pages/UserManagement/useUserManagement.ts`

**Current:** 599 lines (single hook with complex state management)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/pages/UserManagement/types.ts` | All TypeScript interfaces (`User`, `UserRole`, `SortField`, `SortOrder`, `FilterChip`, `FormData`, `UseUserManagementReturn`) | ~60 |
| `src/pages/UserManagement/useUserManagement.ts` | Simplified hook - keep state + computed values + API calls | ~400 |
| `src/pages/UserManagement/index.ts` | Re-exports | ~15 |

**Rationale:** The hook is already well-structured but too large. The interface definitions can be extracted. The internal state management logic should NOT be split further as it would break the single source of truth for state.

**Files to create:**
- Create: `src/pages/UserManagement/types.ts`

**Import updates required in:**
- `src/pages/UserManagement/UserManagement.tsx` (if exists, check imports)

---

## Phase 2: UI Components

### Task 3: Split `src/components/ui/Select.tsx`

**Current:** 596 lines (root Select + SelectTrigger + SelectValue + SelectContent + SelectItem + SelectGroup + SelectLabel + SelectSeparator)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/components/ui/Select/SelectContext.tsx` | `SelectContext`, `useSelectContext`, `SelectProvider` wrapper | ~50 |
| `src/components/ui/Select/SelectTrigger.tsx` | `SelectTriggerProps`, `SelectTriggerInner` | ~60 |
| `src/components/ui/Select/SelectValue.tsx` | `SelectValueProps`, `SelectValueInner` | ~40 |
| `src/components/ui/Select/SelectContent.tsx` | `SelectContentProps`, `SelectContentInner` | ~70 |
| `src/components/ui/Select/SelectItem.tsx` | `SelectItemProps`, `SelectItemInner` | ~65 |
| `src/components/ui/Select/SelectGroup.tsx` | `SelectGroupProps` | ~15 |
| `src/components/ui/Select/SelectLabel.tsx` | `SelectLabelProps` | ~15 |
| `src/components/ui/Select/SelectSeparator.tsx` | `SelectSeparatorProps` | ~15 |
| `src/components/ui/Select/index.tsx` | Re-exports + main `Select` component | ~120 |
| `src/components/ui/Select/variants.ts` | `selectTriggerVariants`, `selectContentVariants`, `selectItemVariants` CVA definitions | ~40 |

**Key considerations:**
- Context must be in its own file for sharing between components
- Main `Select` component wraps context provider and renders children
- Each sub-component gets its own file following pattern in codebase

**Files to create:**
- Create: `src/components/ui/Select/SelectContext.tsx`
- Create: `src/components/ui/Select/SelectTrigger.tsx`
- Create: `src/components/ui/Select/SelectValue.tsx`
- Create: `src/components/ui/Select/SelectContent.tsx`
- Create: `src/components/ui/Select/SelectItem.tsx`
- Create: `src/components/ui/Select/SelectGroup.tsx`
- Create: `src/components/ui/Select/SelectLabel.tsx`
- Create: `src/components/ui/Select/SelectSeparator.tsx`
- Create: `src/components/ui/Select/variants.ts`
- Create: `src/components/ui/Select/index.tsx`

**Import updates required in:**
- All files importing `Select` components (check via grep)

---

### Task 4: Split `src/components/workflow/config-panels/ActionConfigPanel.tsx`

**Current:** 488 lines (ActionConfigPanel + ACTION_FIELDS constant + caching logic)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/components/workflow/config-panels/ActionConfigPanel.tsx` | Main component only (~180 lines) | ~180 |
| `src/components/workflow/config-panels/field-definitions.ts` | `ACTION_FIELDS` constant with all field definitions for text, image, voice, music, video actions | ~250 |
| `src/components/workflow/config-panels/field-definitions.types.ts` | `FieldDefinition` type | ~20 |
| `src/components/workflow/config-panels/index.ts` | Re-exports | ~10 |

**Rationale:** `ACTION_FIELDS` is a large constant (~250 lines) defining field schemas for different action types. This is pure data/configuration and can be separated.

**Files to create:**
- Create: `src/components/workflow/config-panels/field-definitions.ts`
- Create: `src/components/workflow/config-panels/field-definitions.types.ts`
- Modify: `src/components/workflow/config-panels/ActionConfigPanel.tsx` (keep component only)

---

## Phase 3: Page Components

### Task 5: Split `src/pages/VoiceAsync.tsx`

**Current:** 965 lines (main component + helper functions + inline styled components)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/pages/VoiceAsync.tsx` | Main `VoiceAsync` component (~400 lines) | ~400 |
| `src/pages/VoiceAsync/TaskItem.tsx` | `TaskItem` component - renders individual task in list (~100 lines) | ~100 |
| `src/pages/VoiceAsync/TextInputTab.tsx` | Text input tab content (~80 lines) | ~80 |
| `src/pages/VoiceAsync/FileUploadTab.tsx` | File upload tab content (~100 lines) | ~100 |
| `src/pages/VoiceAsync/ParameterSettings.tsx` | Parameter settings card (~150 lines) | ~150 |
| `src/pages/VoiceAsync/helpers.ts` | `saveToMedia`, `formatDuration`, `getStatusIcon`, `getStatusBadge`, `getProgressForStatus`, `getProgressColor` | ~60 |
| `src/pages/VoiceAsync/types.ts` | `Task`, `TaskStatus` types | ~20 |
| `src/pages/VoiceAsync/index.ts` | Re-exports | ~10 |

**Key components identified:**
- Lines 85-107: Animation variants (can stay in main file)
- Lines 109-121: `saveToMedia` function → `helpers.ts`
- Lines 360-464: `getStatusIcon`, `getStatusBadge`, `getProgressForStatus`, `getProgressColor` → `helpers.ts`
- Lines 466-964: Main component with two major sections:
  - Input panel (lines 480-761) → `TextInputTab` + `FileUploadTab` + `ParameterSettings`
  - Task list panel (lines 764-945) → `TaskItem` for each task

**Files to create:**
- Create: `src/pages/VoiceAsync/TaskItem.tsx`
- Create: `src/pages/VoiceAsync/TextInputTab.tsx`
- Create: `src/pages/VoiceAsync/FileUploadTab.tsx`
- Create: `src/pages/VoiceAsync/ParameterSettings.tsx`
- Create: `src/pages/VoiceAsync/helpers.ts`
- Create: `src/pages/VoiceAsync/types.ts`
- Create: `src/pages/VoiceAsync/index.ts`

**Modify:** `src/pages/VoiceAsync.tsx` (reduce to main component only)

---

### Task 6: Split `src/pages/VoiceSync.tsx`

**Current:** 733 lines (main component + VoiceWaveform + GlassAudioPlayer + helpers)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/pages/VoiceSync.tsx` | Main `VoiceSync` component (~430 lines) | ~430 |
| `src/pages/VoiceSync/GlassAudioPlayer.tsx` | `GlassAudioPlayer` component (~110 lines) | ~110 |
| `src/pages/VoiceSync/VoiceWaveform.tsx` | `VoiceWaveform` component (~30 lines) | ~30 |
| `src/pages/VoiceSync/helpers.ts` | `saveToMedia`, `genderTokens` constant | ~25 |
| `src/pages/VoiceSync/ConfigPanel.tsx` | Right sidebar config panel (~150 lines) | ~150 |
| `src/pages/VoiceSync/index.ts` | Re-exports | ~10 |

**Key components identified:**
- Lines 20-24: `genderTokens` constant → `helpers.ts`
- Lines 62-72: `saveToMedia` → `helpers.ts`
- Lines 74-99: `VoiceWaveform` → separate file
- Lines 101-209: `GlassAudioPlayer` → separate file
- Main component (lines 211-665) contains text input, result display, and config panel
- Config panel section (lines 452-666) can be extracted to `ConfigPanel.tsx`

**Files to create:**
- Create: `src/pages/VoiceSync/GlassAudioPlayer.tsx`
- Create: `src/pages/VoiceSync/VoiceWaveform.tsx`
- Create: `src/pages/VoiceSync/helpers.ts`
- Create: `src/pages/VoiceSync/ConfigPanel.tsx`
- Create: `src/pages/VoiceSync/index.ts`

**Modify:** `src/pages/VoiceSync.tsx` (reduce to main component only)

---

### Task 7: Split `src/pages/DeadLetterQueue.tsx`

**Current:** 938 lines (main component + helper functions + modals)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/pages/DeadLetterQueue.tsx` | Main component (~330 lines) | ~330 |
| `src/pages/DeadLetterQueue/ErrorDetailModal.tsx` | `ErrorDetailModal` component (~80 lines) | ~80 |
| `src/pages/DeadLetterQueue/AutoRetryConfigModal.tsx` | `AutoRetryConfigModal` component (~130 lines) | ~130 |
| `src/pages/DeadLetterQueue/BulkRetryModal.tsx` | `BulkRetryModal` component (~60 lines) | ~60 |
| `src/pages/DeadLetterQueue/StatusBadge.tsx` | `StatusBadge` memo component (~30 lines) | ~30 |
| `src/pages/DeadLetterQueue/helpers.ts` | `formatDate`, `truncateText` | ~20 |
| `src/pages/DeadLetterQueue/types.ts` | Type imports if needed | ~10 |
| `src/pages/DeadLetterQueue/index.ts` | Re-exports | ~10 |

**Key components identified:**
- Lines 63-82: `formatDate`, `truncateText` → `helpers.ts`
- Lines 85-115: `StatusBadge` → `StatusBadge.tsx`
- Lines 120-200: `ErrorDetailModal` → `ErrorDetailModal.tsx`
- Lines 205-334: `AutoRetryConfigModal` → `AutoRetryConfigModal.tsx`
- Lines 336-404: `BulkRetryModal` → `BulkRetryModal.tsx`
- Main component (lines 410-937) remains

**Files to create:**
- Create: `src/pages/DeadLetterQueue/ErrorDetailModal.tsx`
- Create: `src/pages/DeadLetterQueue/AutoRetryConfigModal.tsx`
- Create: `src/pages/DeadLetterQueue/BulkRetryModal.tsx`
- Create: `src/pages/DeadLetterQueue/StatusBadge.tsx`
- Create: `src/pages/DeadLetterQueue/helpers.ts`
- Create: `src/pages/DeadLetterQueue/index.ts`

**Modify:** `src/pages/DeadLetterQueue.tsx` (reduce to main component only)

---

### Task 8: Split `src/pages/InvitationCodes.tsx`

**Current:** 774 lines (main component + SortButton + StatCard + helper functions)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/pages/InvitationCodes.tsx` | Main component (~450 lines) | ~450 |
| `src/pages/InvitationCodes/SortButton.tsx` | `SortButton` component (~30 lines) | ~30 |
| `src/pages/InvitationCodes/StatCard.tsx` | `StatCard` component (~50 lines) | ~50 |
| `src/pages/InvitationCodes/helpers.ts` | `formatDate`, `formatFullDate`, `isExpired`, `isUsable`, `isFullyUsed` | ~30 |
| `src/pages/InvitationCodes/types.ts` | `InvitationCode`, `StatusFilter`, `SortField`, `SortOrder`, `FilterChip` | ~20 |
| `src/pages/InvitationCodes/index.ts` | Re-exports | ~10 |

**Note:** The file has an import statement at line 726 (`import { ChevronDown, ChevronUp } from 'lucide-react'`) placed after component definitions - this is a bug to fix during refactor.

**Key components identified:**
- Lines 51-93: `formatDate`, `formatFullDate`, `isExpired`, `isUsable`, `isFullyUsed` → `helpers.ts`
- Lines 95-100: `FilterChip` interface → `types.ts`
- Lines 270-296: `SortButton` → `SortButton.tsx`
- Lines 728-774: `StatCard` → `StatCard.tsx`
- Main component (lines 102-723) remains

**Files to create:**
- Create: `src/pages/InvitationCodes/SortButton.tsx`
- Create: `src/pages/InvitationCodes/StatCard.tsx`
- Create: `src/pages/InvitationCodes/helpers.ts`
- Create: `src/pages/InvitationCodes/types.ts`
- Create: `src/pages/InvitationCodes/index.ts`

**Modify:** `src/pages/InvitationCodes.tsx` (reduce to main component only, fix import placement)

---

### Task 9: Split `src/pages/WebhookManagement.tsx`

**Current:** 765 lines (main component + WebhookFormModal + DeliveryLogModal + StatusBadge + EventBadge)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/pages/WebhookManagement.tsx` | Main component (~200 lines) | ~200 |
| `src/pages/WebhookManagement/WebhookFormModal.tsx` | `WebhookFormModal` component (~320 lines) | ~320 |
| `src/pages/WebhookManagement/DeliveryLogModal.tsx` | `DeliveryLogModal` component (~90 lines) | ~90 |
| `src/pages/WebhookManagement/WebhooksListTab.tsx` | `WebhooksListTab` component (~190 lines) | ~190 |
| `src/pages/WebhookManagement/StatusBadge.tsx` | `StatusBadge` memo component (~15 lines) | ~15 |
| `src/pages/WebhookManagement/EventBadge.tsx` | `EventBadge` memo component (~20 lines) | ~20 |
| `src/pages/WebhookManagement/helpers.ts` | `formatDate`, `WEBHOOK_EVENTS` constant | ~20 |
| `src/pages/WebhookManagement/index.ts` | Re-exports | ~10 |

**Key components identified:**
- Lines 53-68: `WEBHOOK_EVENTS`, `formatDate` → `helpers.ts`
- Lines 70-82: `StatusBadge` → `StatusBadge.tsx`
- Lines 84-102: `EventBadge` → `EventBadge.tsx`
- Lines 104-421: `WebhookFormModal` → `WebhookFormModal.tsx`
- Lines 423-510: `DeliveryLogModal` → `DeliveryLogModal.tsx`
- Lines 512-704: `WebhooksListTab` → `WebhooksListTab.tsx`
- Main component (lines 706-765) remains

**Files to create:**
- Create: `src/pages/WebhookManagement/WebhookFormModal.tsx`
- Create: `src/pages/WebhookManagement/DeliveryLogModal.tsx`
- Create: `src/pages/WebhookManagement/WebhooksListTab.tsx`
- Create: `src/pages/WebhookManagement/StatusBadge.tsx`
- Create: `src/pages/WebhookManagement/EventBadge.tsx`
- Create: `src/pages/WebhookManagement/helpers.ts`
- Create: `src/pages/WebhookManagement/index.ts`

**Modify:** `src/pages/WebhookManagement.tsx` (reduce to main component only)

---

### Task 10: Split `src/pages/WorkflowMarketplace.tsx`

**Current:** 558 lines (main component + TemplateCard + TemplateListItem + helpers)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/pages/WorkflowMarketplace.tsx` | Main component (~230 lines) | ~230 |
| `src/pages/WorkflowMarketplace/TemplateCard.tsx` | `TemplateCard` component (~100 lines) | ~100 |
| `src/pages/WorkflowMarketplace/TemplateListItem.tsx` | `TemplateListItem` component (~80 lines) | ~80 |
| `src/pages/WorkflowMarketplace/helpers.ts` | `getNodeCount`, `getDifficultyLabel`, `getDifficultyColor`, `getCategoryIcon`, `ICON_MAP` | ~40 |
| `src/pages/WorkflowMarketplace/types.ts` | `TemplateCardProps`, `TemplateListItemProps` | ~20 |
| `src/pages/WorkflowMarketplace/index.ts` | Re-exports | ~10 |

**Key components identified:**
- Lines 42-55: Animation variants (can stay in main)
- Lines 57-65: `ICON_MAP` → `helpers.ts`
- Lines 67-92: Helper functions → `helpers.ts`
- Lines 367-468: `TemplateCard` → `TemplateCard.tsx`
- Lines 470-558: `TemplateListItem` → `TemplateListItem.tsx`
- Main component (lines 94-365) remains

**Files to create:**
- Create: `src/pages/WorkflowMarketplace/TemplateCard.tsx`
- Create: `src/pages/WorkflowMarketplace/TemplateListItem.tsx`
- Create: `src/pages/WorkflowMarketplace/helpers.ts`
- Create: `src/pages/WorkflowMarketplace/types.ts`
- Create: `src/pages/WorkflowMarketplace/index.ts`

**Modify:** `src/pages/WorkflowMarketplace.tsx` (reduce to main component only)

---

### Task 11: Split `src/pages/ServiceNodeManagement.tsx`

**Current:** 523 lines (main component + CategorySection + NodeCard + StatCard)

**Proposed Split:**

| New File | Contents | Est. Lines |
|----------|----------|------------|
| `src/pages/ServiceNodeManagement.tsx` | Main component (~180 lines) | ~180 |
| `src/pages/ServiceNodeManagement/CategorySection.tsx` | `CategorySection` component (~95 lines) | ~95 |
| `src/pages/ServiceNodeManagement/NodeCard.tsx` | `NodeCard` component (~120 lines) | ~120 |
| `src/pages/ServiceNodeManagement/StatCard.tsx` | `StatCard` component (~55 lines) | ~55 |
| `src/pages/ServiceNodeManagement/helpers.ts` | `ROLE_CONFIG`, `CATEGORY_CONFIG` constants | ~40 |
| `src/pages/ServiceNodeManagement/types.ts` | `ServiceNodePermission`, `UserRole` | ~15 |
| `src/pages/ServiceNodeManagement/index.ts` | Re-exports | ~10 |

**Key components identified:**
- Lines 29-46: `ServiceNodePermission`, `UserRole` → `types.ts`
- Lines 41-90: `ROLE_CONFIG`, `CATEGORY_CONFIG` → `helpers.ts`
- Lines 253-344: `CategorySection` → `CategorySection.tsx`
- Lines 346-466: `NodeCard` → `NodeCard.tsx`
- Lines 468-523: `StatCard` → `StatCard.tsx`
- Main component (lines 92-251) remains

**Files to create:**
- Create: `src/pages/ServiceNodeManagement/CategorySection.tsx`
- Create: `src/pages/ServiceNodeManagement/NodeCard.tsx`
- Create: `src/pages/ServiceNodeManagement/StatCard.tsx`
- Create: `src/pages/ServiceNodeManagement/helpers.ts`
- Create: `src/pages/ServiceNodeManagement/types.ts`
- Create: `src/pages/ServiceNodeManagement/index.ts`

**Modify:** `src/pages/ServiceNodeManagement.tsx` (reduce to main component only)

---

### Task 12: Analyze `src/pages/WorkflowBuilder.tsx`

**Current:** 494 lines

**Proposed Split:** NO SPLIT NEEDED

**Rationale:** This file is already well-structured:
- Lines 1-45: Imports and type definitions
- Lines 48-485: `WorkflowBuilderInner` - main logic (~440 lines)
- Lines 488-494: `WorkflowBuilderPage` wrapper (~10 lines)

The file imports all sub-components from `@/components/workflow/builder`:
- `WorkflowToolbar`
- `WorkflowNodePalette`
- `WorkflowConfigPanel`
- `WorkflowVersionPanel`
- `ExecutionStatusPanel`
- `WorkflowCanvas`

The main component delegates to these sub-components rather than containing them inline. At 494 lines with delegation pattern, this is acceptable.

**Recommendation:** Mark as acceptable - no action needed.

---

## Implementation Checklist

### Phase 1: Types and Utilities
- [ ] Task 1: Split `src/data/workflow-templates.ts`
- [ ] Task 2: Split `src/pages/UserManagement/useUserManagement.ts`

### Phase 2: UI Components
- [ ] Task 3: Split `src/components/ui/Select.tsx`
- [ ] Task 4: Split `src/components/workflow/config-panels/ActionConfigPanel.tsx`

### Phase 3: Page Components
- [ ] Task 5: Split `src/pages/VoiceAsync.tsx`
- [ ] Task 6: Split `src/pages/VoiceSync.tsx`
- [ ] Task 7: Split `src/pages/DeadLetterQueue.tsx`
- [ ] Task 8: Split `src/pages/InvitationCodes.tsx`
- [ ] Task 9: Split `src/pages/WebhookManagement.tsx`
- [ ] Task 10: Split `src/pages/WorkflowMarketplace.tsx`
- [ ] Task 11: Split `src/pages/ServiceNodeManagement.tsx`
- [ ] Task 12: Analyze `src/pages/WorkflowBuilder.tsx` (no action needed)

---

## Verification

After each file split:
1. Run `npm run build` to verify no TypeScript errors
2. Run `vitest run` to verify all tests pass
3. Verify import paths work correctly
4. Verify functionality is preserved

---

## Estimated Results

After all splits:

| Original File | New File Count | Largest Remaining |
|---------------|----------------|-------------------|
| `src/data/workflow-templates.ts` | 3 | ~897 (data file) |
| `src/pages/DeadLetterQueue.tsx` | 7 | ~330 |
| `src/pages/InvitationCodes.tsx` | 5 | ~450 |
| `src/pages/WebhookManagement.tsx` | 7 | ~200 |
| `src/pages/VoiceAsync.tsx` | 7 | ~400 |
| `src/pages/VoiceSync.tsx` | 5 | ~430 |
| `src/pages/UserManagement/useUserManagement.ts` | 3 | ~400 |
| `src/components/ui/Select.tsx` | 9 | ~120 |
| `src/pages/WorkflowMarketplace.tsx` | 5 | ~230 |
| `src/pages/ServiceNodeManagement.tsx` | 6 | ~180 |
| `src/pages/WorkflowBuilder.tsx` | 1 | ~494 (acceptable) |
| `src/components/workflow/config-panels/ActionConfigPanel.tsx` | 3 | ~180 |

**All files under 500 lines after split, except:**
- `src/data/workflow-templates/index.ts` (~897 lines of pure data - acceptable)
- Data files are exempt from line count targets
