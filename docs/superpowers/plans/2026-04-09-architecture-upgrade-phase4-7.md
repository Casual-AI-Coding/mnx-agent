# Architecture Upgrade: Phase 4-2 & Phase 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete fetch API migration (2 calls) and frontend component splitting (57 files from 12 source files) with all builds passing and TypeScript error-free.

**Architecture:** Parallel execution with dependency-aware waves. Phase 4-2 completes first (unblocks component splits). Phase 7 uses 3-wave dependency chain: types → UI components → page components.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, axios (apiClient), better-sqlite3, vitest

---

## Overview

This plan covers the final phases of the architecture upgrade:

| Phase | Scope | Files Changed | Effort |
|-------|-------|---------------|--------|
| **4-2** | Fetch API Migration | 2 files, 2 calls | 30 min |
| **7** | Component Splitting | 12 → 57 files | 6-8 hours |

### Phase 4-2 Discovery (CRITICAL)

After exploration, only **2 fetch() calls need migration** to apiClient:

| File | Calls | Target | Action |
|------|-------|--------|--------|
| `ActionConfigPanel.tsx` | 1 | `/api/workflows/available-actions` | **MIGRATE** |
| `capacity.ts` | 1 | `/api/capacity` | **MIGRATE** |
| `src/lib/api/*.ts` (7 files) | 13 | MiniMax API | **KEEP AS-IS** |

**Why keep src/lib/api/*.ts as-is?** These call MiniMax's external API directly with special handling (hex encoding, streaming, proxy modes) that apiClient doesn't need to handle.

---

## Task Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PARALLEL EXECUTION MAP                              │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 4-2 (Independent - Run First)
┌─────────────────────────────────────────────────────────────────┐
│  Task 4-2-1: ActionConfigPanel.tsx fetch → apiClient            │
│  Task 4-2-2: capacity.ts fetch → apiClient                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (unblocks Phase 7)
PHASE 7 - WAVE 1 (Types & Data - Can run in parallel)
┌─────────────────────────────────────────────────────────────────┐
│  Task 7-1: workflow-templates.ts → types + constants + index    │
│  Task 7-2: UserManagement → types extraction                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
PHASE 7 - WAVE 2 (Shared UI Components - Must complete before Wave 3)
┌─────────────────────────────────────────────────────────────────┐
│  Task 7-3: Select.tsx → 9 files (CRITICAL - 7+ dependents)      │
│  Task 7-4: ActionConfigPanel.tsx → 3 files (also updates import)│
└─────────────────────────────────────────────────────────────────┘
                              ↓
PHASE 7 - WAVE 3 (Page Components - All can run in parallel)
┌─────────────────────────────────────────────────────────────────┐
│  Task 7-5:  DeadLetterQueue.tsx → 7 files                       │
│  Task 7-6:  InvitationCodes.tsx → 5 files                       │
│  Task 7-7:  WebhookManagement.tsx → 7 files                     │
│  Task 7-8:  VoiceAsync.tsx → 7 files                            │
│  Task 7-9:  VoiceSync.tsx → 5 files                             │
│  Task 7-10: WorkflowMarketplace.tsx → 5 files                   │
│  Task 7-11: ServiceNodeManagement.tsx → 6 files                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 4-2: Fetch API Migration

**Estimated Duration:** 30 minutes
**Agent Category:** quick (2 simple migrations)
**Pre-requisites:** None
**Unblocks:** Phase 7 Task 7-4

---

### Task 4-2-1: Migrate ActionConfigPanel.tsx

**Files:**
- Modify: `src/components/workflow/config-panels/ActionConfigPanel.tsx:42`
- Test: TypeScript compilation + existing tests

**Agent Category:** quick

- [ ] **Step 1: Write verification test (TDD)**

Before changing code, verify the current behavior works:

```bash
# Verify current build passes
cd /home/ogslp/Projects/Opencode/mnx-agent
npm run build 2>&1 | head -50
# Expected: No TypeScript errors in this file
```

- [ ] **Step 2: Import apiClient**

```typescript
// Add to imports at top of file
import { apiClient } from '@/lib/api/client';
```

- [ ] **Step 3: Migrate fetch to apiClient**

Replace the fetch call at line 42:

```typescript
// BEFORE (line 42):
const response = await fetch('/api/workflows/available-actions');
const data = await response.json() as GroupedActionNodes;

// AFTER:
const { data } = await apiClient.get<GroupedActionNodes>('/workflows/available-actions');
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build 2>&1 | grep -E "(error|ActionConfig)" | head -20
# Expected: No errors in ActionConfigPanel.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/workflow/config-panels/ActionConfigPanel.tsx
git commit -m "refactor(api): migrate ActionConfigPanel to apiClient

- Replace raw fetch with apiClient.get<GroupedActionNodes>
- Removes manual response.json() parsing
- Leverages automatic auth header injection

Part of Phase 4-2 fetch migration."
```

**QA Verification:**
- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] No runtime errors in browser console when loading workflow builder
- [ ] Network tab shows `/api/workflows/available-actions` request with proper auth headers

---

### Task 4-2-2: Migrate capacity.ts

**Files:**
- Modify: `src/stores/capacity.ts:51`
- Test: TypeScript compilation + existing tests

**Agent Category:** quick

- [ ] **Step 1: Verify current implementation**

```bash
cd /home/ogslp/Projects/Opencode/mnx-agent
head -70 src/stores/capacity.ts
# Look for fetch call around line 51
```

- [ ] **Step 2: Import apiClient**

```typescript
// Add to imports at top of file
import { apiClient } from '@/lib/api/client';
```

- [ ] **Step 3: Migrate fetch to apiClient**

Replace the fetch call (around line 51):

```typescript
// BEFORE:
const response = await fetch('/api/capacity', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});
const data = await response.json();

// AFTER:
const { data } = await apiClient.get('/capacity');
// Note: apiClient automatically handles auth headers via interceptors
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build 2>&1 | grep -E "(error|capacity)" | head -20
# Expected: No errors in capacity.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/capacity.ts
git commit -m "refactor(api): migrate capacity store to apiClient

- Replace raw fetch with apiClient.get
- Removes manual header construction
- Automatic JWT Bearer token injection

Part of Phase 4-2 fetch migration."
```

**QA Verification:**
- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] Capacity data loads correctly on dashboard
- [ ] Network tab shows `/api/capacity` request with Authorization header

---

## Phase 7: Component Splitting

**Estimated Duration:** 6-8 hours
**Agent Category:** visual-engineering (UI component work)
**Pre-requisites:** Phase 4-2 complete
**Total:** 12 source files → 57 output files (11 files need splitting, 1 unchanged)

---

### Wave 1: Types & Data (Parallelizable)

**Estimated Duration:** 45 minutes
**Agent Category:** quick (straightforward extractions)
**Unblocks:** Wave 2 and Wave 3

---

#### Task 7-1: Split workflow-templates.ts

**Files:**
- Create: `src/data/workflow-templates/types.ts` (~70 lines)
- Create: `src/data/workflow-templates/constants.ts` (~15 lines)
- Modify: `src/data/workflow-templates/index.ts` (~897 lines, extracted from original)
- Delete: `src/data/workflow-templates.ts` (after migration)
- Test: TypeScript compilation + imports

**Agent Category:** quick

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/data/workflow-templates
```

- [ ] **Step 2: Extract types**

Create `src/data/workflow-templates/types.ts`:

```typescript
/**
 * Workflow Template Types
 * Extracted from workflow-templates.ts
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  type: 'action' | 'condition' | 'transform' | 'loop' | 'queue';
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export type TemplateCategory = 
  | 'content-generation'
  | 'media-processing'
  | 'automation'
  | 'integration';
```

- [ ] **Step 3: Extract constants**

Create `src/data/workflow-templates/constants.ts`:

```typescript
/**
 * Workflow Template Constants
 * Extracted from workflow-templates.ts
 */

export const TEMPLATE_CATEGORIES: Record<string, string> = {
  'content-generation': 'Content Generation',
  'media-processing': 'Media Processing',
  'automation': 'Automation',
  'integration': 'Integration',
};

export const DEFAULT_TEMPLATE_LIMIT = 20;
```

- [ ] **Step 4: Create index with re-exports**

Create `src/data/workflow-templates/index.ts`:

```typescript
/**
 * Workflow Templates Module
 * Refactored from monolithic workflow-templates.ts
 */

// Re-export types
export type {
  WorkflowTemplate,
  WorkflowNode,
  WorkflowEdge,
  TemplateCategory,
} from './types';

// Re-export constants
export {
  TEMPLATE_CATEGORIES,
  DEFAULT_TEMPLATE_LIMIT,
} from './constants';

// Import original data (will be moved here)
import type { WorkflowTemplate } from './types';

// Move BUILTIN_TEMPLATES data here from original file
export const BUILTIN_TEMPLATES: WorkflowTemplate[] = [
  // ... (copy all template data from original file)
];

// Move helper functions here
export function getTemplatesByCategory(
  category: string
): WorkflowTemplate[] {
  return BUILTIN_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return BUILTIN_TEMPLATES.find(t => t.id === id);
}
```

- [ ] **Step 5: Update all imports**

```bash
# Find all files importing from workflow-templates.ts
grep -r "from.*workflow-templates" src/ --include="*.ts" --include="*.tsx"

# Update imports:
# FROM: import { ... } from '@/data/workflow-templates'
# TO:   import { ... } from '@/data/workflow-templates/index'
# OR:   import { ... } from '@/data/workflow-templates' (index auto-resolves)
```

- [ ] **Step 6: Delete original file**

```bash
rm src/data/workflow-templates.ts
```

- [ ] **Step 7: Verify build passes**

```bash
npm run build 2>&1 | grep -E "error.*workflow" | head -20
# Expected: No errors
```

- [ ] **Step 8: Commit**

```bash
git add src/data/workflow-templates/
git rm src/data/workflow-templates.ts
git commit -m "refactor(data): split workflow-templates into module

- Extract types to types.ts
- Extract constants to constants.ts
- Create index.ts with re-exports
- Maintain backward compatibility via index exports

Part of Phase 7 component splitting."
```

**QA Verification:**
- [ ] `npm run build` passes
- [ ] `grep -r "from.*workflow-templates" src/ | wc -l` shows same import count
- [ ] WorkflowMarketplace loads templates correctly

---

#### Task 7-2: Split UserManagement Types

**Files:**
- Create: `src/pages/UserManagement/types.ts` (~60 lines)
- Modify: `src/pages/UserManagement/useUserManagement.ts` (~400 lines, remove types)
- Create: `src/pages/UserManagement/index.ts` (~15 lines)
- Test: TypeScript compilation

**Agent Category:** quick

- [ ] **Step 1: Create directory if needed**

```bash
mkdir -p src/pages/UserManagement
```

- [ ] **Step 2: Extract types**

Create `src/pages/UserManagement/types.ts`:

```typescript
/**
 * User Management Types
 * Extracted from useUserManagement.ts
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'pro' | 'admin' | 'super';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserFilters {
  search?: string;
  role?: User['role'];
  status?: 'active' | 'inactive';
}

export interface UserSortConfig {
  field: keyof User;
  direction: 'asc' | 'desc';
}

export interface UseUserManagementReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  filters: UserFilters;
  sortConfig: UserSortConfig;
  setFilters: (filters: UserFilters) => void;
  setSortConfig: (config: UserSortConfig) => void;
  refreshUsers: () => Promise<void>;
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
}
```

- [ ] **Step 3: Update useUserManagement.ts**

Remove type definitions from `src/pages/UserManagement/useUserManagement.ts`:

```typescript
// Add import at top
import type {
  User,
  UserFilters,
  UserSortConfig,
  UseUserManagementReturn,
} from './types';

// Remove all interface/type definitions that are now in types.ts
// Keep only the useUserManagement function implementation
```

- [ ] **Step 4: Create index.ts**

Create `src/pages/UserManagement/index.ts`:

```typescript
/**
 * User Management Module
 */

export type {
  User,
  UserFilters,
  UserSortConfig,
  UseUserManagementReturn,
} from './types';

export { useUserManagement } from './useUserManagement';
```

- [ ] **Step 5: Update imports**

```bash
# Update files importing from useUserManagement.ts
# FROM: import { useUserManagement } from './useUserManagement'
# TO:   import { useUserManagement } from './UserManagement'
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | grep -E "error.*User" | head -10
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/UserManagement/
git commit -m "refactor(user): extract UserManagement types

- Extract types to types.ts
- Create index.ts for module exports
- Clean up type definitions from hook file

Part of Phase 7 component splitting."
```

---

### Wave 2: Shared UI Components (Critical Path)

**Estimated Duration:** 2 hours
**Agent Category:** visual-engineering (complex UI component refactoring)
**Pre-requisites:** Wave 1 complete
**Unblocks:** Wave 3 (all page components depend on Select.tsx)

---

#### Task 7-3: Split Select.tsx (CRITICAL - Most Dependencies)

**Files:**
- Create: `src/components/ui/Select/SelectContext.tsx` (~50 lines)
- Create: `src/components/ui/Select/SelectTrigger.tsx` (~60 lines)
- Create: `src/components/ui/Select/SelectValue.tsx` (~40 lines)
- Create: `src/components/ui/Select/SelectContent.tsx` (~70 lines)
- Create: `src/components/ui/Select/SelectItem.tsx` (~65 lines)
- Create: `src/components/ui/Select/SelectGroup.tsx` (~15 lines)
- Create: `src/components/ui/Select/SelectLabel.tsx` (~15 lines)
- Create: `src/components/ui/Select/SelectSeparator.tsx` (~15 lines)
- Create: `src/components/ui/Select/variants.ts` (~40 lines)
- Create: `src/components/ui/Select/index.tsx` (~120 lines)
- Delete: `src/components/ui/Select.tsx` (after migration)
- Test: TypeScript compilation + all Select usages

**Agent Category:** visual-engineering

**⚠️ CRITICAL:** This file is used by 7+ page components. Must complete before Wave 3.

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/components/ui/Select
```

- [ ] **Step 2: Create variants.ts**

Create `src/components/ui/Select/variants.ts`:

```typescript
/**
 * Select Component Variants
 * Extracted from Select.tsx
 */

import { cva } from 'class-variance-authority';

export const selectTriggerVariants = cva(
  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        outline: 'border-2',
        ghost: 'border-none bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export const selectContentVariants = cva(
  'relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
);

export const selectItemVariants = cva(
  'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
);
```

- [ ] **Step 3: Create SelectContext.tsx**

Create `src/components/ui/Select/SelectContext.tsx`:

```typescript
/**
 * Select Context
 * Manages shared state for Select components
 */

import React, { createContext, useContext, useState } from 'react';

interface SelectContextValue {
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  multiple: boolean;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select provider');
  }
  return context;
}

interface SelectProviderProps {
  children: React.ReactNode;
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  multiple?: boolean;
}

export function SelectProvider({
  children,
  value,
  onValueChange,
  multiple = false,
}: SelectProviderProps) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, multiple }}>
      {children}
    </SelectContext.Provider>
  );
}
```

- [ ] **Step 4: Create sub-components**

Create `src/components/ui/Select/SelectTrigger.tsx`:

```typescript
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSelectContext } from './SelectContext';
import { selectTriggerVariants } from './variants';

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, variant, children, ...props }, ref) => {
    const { setOpen } = useSelectContext();

    return (
      <button
        ref={ref}
        type="button"
        className={cn(selectTriggerVariants({ variant }), className)}
        onClick={() => setOpen(true)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';
```

Create remaining components (SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator) following same pattern - copying logic from original Select.tsx while using the shared context.

- [ ] **Step 5: Create index.tsx**

Create `src/components/ui/Select/index.tsx`:

```typescript
/**
 * Select Component Module
 * Refactored from monolithic Select.tsx
 */

export { SelectProvider } from './SelectContext';
export { SelectTrigger } from './SelectTrigger';
export { SelectValue } from './SelectValue';
export { SelectContent } from './SelectContent';
export { SelectItem } from './SelectItem';
export { SelectGroup } from './SelectGroup';
export { SelectLabel } from './SelectLabel';
export { SelectSeparator } from './SelectSeparator';

// Convenience exports
export {
  selectTriggerVariants,
  selectContentVariants,
  selectItemVariants,
} from './variants';

// Re-export context hook for advanced use cases
export { useSelectContext } from './SelectContext';
```

- [ ] **Step 6: Update all imports**

```bash
# Find all files importing from Select.tsx
grep -r "from.*components/ui/Select" src/ --include="*.tsx" | grep -v "Select/"

# Update imports to use index
# FROM: import { Select, ... } from '@/components/ui/Select'
# TO:   import { ... } from '@/components/ui/Select'
```

- [ ] **Step 7: Delete original file**

```bash
rm src/components/ui/Select.tsx
```

- [ ] **Step 8: Verify build**

```bash
npm run build 2>&1 | grep -E "error.*[Ss]elect" | head -20
# Expected: No Select-related errors
```

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/Select/
git rm src/components/ui/Select.tsx
git commit -m "refactor(ui): split Select component into module

- Extract context management to SelectContext
- Split into 8 focused sub-components
- Extract variants to variants.ts
- Create comprehensive index.ts exports
- Maintains full backward compatibility

CRITICAL: This component is used by 7+ pages.
Must be done before page component splitting.

Part of Phase 7 component splitting."
```

---

#### Task 7-4: Split ActionConfigPanel.tsx

**Files:**
- Create: `src/components/workflow/config-panels/field-definitions.ts` (~250 lines)
- Create: `src/components/workflow/config-panels/field-definitions.types.ts` (~20 lines)
- Modify: `src/components/workflow/config-panels/ActionConfigPanel.tsx` (~180 lines, reduced from 488)
- Test: TypeScript compilation

**Agent Category:** visual-engineering

**Note:** This file was also modified in Phase 4-2. Ensure Phase 4-2 is committed first.

- [ ] **Step 1: Create field-definitions.types.ts**

Create `src/components/workflow/config-panels/field-definitions.types.ts`:

```typescript
/**
 * Field Definition Types
 * Extracted from ActionConfigPanel.tsx
 */

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'boolean' | 'json';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  description?: string;
}

export type FieldDefinitionsMap = Record<string, FieldDefinition[]>;
```

- [ ] **Step 2: Create field-definitions.ts**

Create `src/components/workflow/config-panels/field-definitions.ts`:

```typescript
/**
 * Field Definitions Data
 * Extracted from ActionConfigPanel.tsx
 */

import type { FieldDefinitionsMap } from './field-definitions.types';

export const FIELD_DEFINITIONS: FieldDefinitionsMap = {
  'text-generation': [
    {
      name: 'prompt',
      label: 'Prompt',
      type: 'textarea',
      required: true,
      rows: 4,
      placeholder: 'Enter your prompt here...',
    },
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      required: true,
      options: [
        { value: 'abab5.5', label: 'abab5.5' },
        { value: 'abab6', label: 'abab6' },
      ],
    },
    // ... (copy remaining field definitions from original)
  ],
  // ... other action types
};

export function getFieldsForAction(actionType: string): FieldDefinition[] {
  return FIELD_DEFINITIONS[actionType] || [];
}
```

- [ ] **Step 3: Update ActionConfigPanel.tsx**

Remove field definitions from ActionConfigPanel.tsx and add import:

```typescript
// Add import
import { FIELD_DEFINITIONS, getFieldsForAction } from './field-definitions';
import type { FieldDefinition } from './field-definitions.types';

// Remove all FIELD_DEFINITIONS constant and FieldDefinition interface
// Keep only the component logic
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error.*ActionConfig" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add src/components/workflow/config-panels/
git commit -m "refactor(workflow): split ActionConfigPanel

- Extract field definitions to field-definitions.ts
- Extract field definition types to field-definitions.types.ts
- Reduce ActionConfigPanel from 488 to ~180 lines
- Cleaner separation of data from UI logic

Part of Phase 7 component splitting."
```

---

### Wave 3: Page Components (All Parallelizable)

**Estimated Duration:** 4-5 hours
**Agent Category:** visual-engineering (page-level component work)
**Pre-requisites:** Wave 2 complete (especially Select.tsx)
**Parallelization:** All 7 tasks can run concurrently

---

#### Task 7-5: Split DeadLetterQueue.tsx

**Files:**
- Create: `src/pages/DeadLetterQueue/ErrorDetailModal.tsx` (~80 lines)
- Create: `src/pages/DeadLetterQueue/AutoRetryConfigModal.tsx` (~130 lines)
- Create: `src/pages/DeadLetterQueue/BulkRetryModal.tsx` (~60 lines)
- Create: `src/pages/DeadLetterQueue/StatusBadge.tsx` (~30 lines)
- Create: `src/pages/DeadLetterQueue/helpers.ts` (~20 lines)
- Create: `src/pages/DeadLetterQueue/types.ts` (~10 lines)
- Modify: `src/pages/DeadLetterQueue/index.tsx` (~600 lines, reduced from 938)
- Delete: `src/pages/DeadLetterQueue.tsx` (after migration)
- Test: TypeScript compilation

**Agent Category:** visual-engineering

- [ ] **Step 1-7: Extract components**

Follow the same pattern as previous tasks:
1. Create directory: `mkdir -p src/pages/DeadLetterQueue`
2. Extract types to `types.ts`
3. Extract helpers to `helpers.ts`
4. Extract each modal/component to separate files
5. Update main file to use imports
6. Delete original
7. Commit

- [ ] **Step 8: Commit**

```bash
git add src/pages/DeadLetterQueue/
git rm src/pages/DeadLetterQueue.tsx
git commit -m "refactor(pages): split DeadLetterQueue into module

- Extract 4 modals to separate components
- Extract StatusBadge component
- Extract types and helpers
- Reduce main component complexity
- From 938 to ~600 lines

Part of Phase 7 component splitting."
```

---

#### Task 7-6: Split InvitationCodes.tsx

**Files:**
- Create: `src/pages/InvitationCodes/SortButton.tsx` (~30 lines)
- Create: `src/pages/InvitationCodes/StatCard.tsx` (~50 lines)
- Create: `src/pages/InvitationCodes/helpers.ts` (~30 lines)
- Create: `src/pages/InvitationCodes/types.ts` (~20 lines)
- Modify: `src/pages/InvitationCodes/index.tsx` (~640 lines, reduced from 774)
- Delete: `src/pages/InvitationCodes.tsx` (after migration)
- Test: TypeScript compilation

**Agent Category:** visual-engineering

**Note:** Fix misplaced import at line 726 during migration.

- [ ] **Step 1-7: Extract components**

Same pattern as Task 7-5.

- [ ] **Step 8: Fix misplaced import**

During extraction, move the misplaced import to the top:

```typescript
// BEFORE (at line 726 in original):
// ... component definitions ...
import { ChevronDown, ChevronUp } from 'lucide-react';

// AFTER (at top of file):
import { ChevronDown, ChevronUp } from 'lucide-react';
// ... rest of imports ...
```

- [ ] **Step 9: Commit**

```bash
git add src/pages/InvitationCodes/
git rm src/pages/InvitationCodes.tsx
git commit -m "refactor(pages): split InvitationCodes into module

- Extract SortButton component
- Extract StatCard component
- Extract types and helpers
- Fix misplaced import (moved to top)
- From 774 to ~640 lines

Part of Phase 7 component splitting."
```

---

#### Task 7-7: Split WebhookManagement.tsx

**Files:**
- Create: `src/pages/WebhookManagement/WebhookFormModal.tsx` (~320 lines)
- Create: `src/pages/WebhookManagement/DeliveryLogModal.tsx` (~90 lines)
- Create: `src/pages/WebhookManagement/WebhooksListTab.tsx` (~190 lines)
- Create: `src/pages/WebhookManagement/StatusBadge.tsx` (~15 lines)
- Create: `src/pages/WebhookManagement/EventBadge.tsx` (~20 lines)
- Create: `src/pages/WebhookManagement/helpers.ts` (~20 lines)
- Modify: `src/pages/WebhookManagement/index.tsx` (~100 lines, reduced from 765)
- Delete: `src/pages/WebhookManagement.tsx` (after migration)
- Test: TypeScript compilation

**Agent Category:** visual-engineering

- [ ] **Step 1-7: Extract components**

Same pattern. The WebhookFormModal is the largest component (~320 lines).

- [ ] **Step 8: Commit**

```bash
git add src/pages/WebhookManagement/
git rm src/pages/WebhookManagement.tsx
git commit -m "refactor(pages): split WebhookManagement into module

- Extract WebhookFormModal (largest at 320 lines)
- Extract DeliveryLogModal
- Extract WebhooksListTab
- Extract StatusBadge and EventBadge
- From 765 to ~100 lines

Part of Phase 7 component splitting."
```

---

#### Task 7-8: Split VoiceAsync.tsx

**Files:**
- Create: `src/pages/VoiceAsync/TaskItem.tsx` (~100 lines)
- Create: `src/pages/VoiceAsync/TextInputTab.tsx` (~80 lines)
- Create: `src/pages/VoiceAsync/FileUploadTab.tsx` (~100 lines)
- Create: `src/pages/VoiceAsync/ParameterSettings.tsx` (~150 lines)
- Create: `src/pages/VoiceAsync/helpers.ts` (~60 lines)
- Create: `src/pages/VoiceAsync/types.ts` (~20 lines)
- Modify: `src/pages/VoiceAsync/index.tsx` (~450 lines, reduced from 965)
- Delete: `src/pages/VoiceAsync.tsx` (after migration)
- Test: TypeScript compilation

**Agent Category:** visual-engineering

- [ ] **Step 1-7: Extract components**

Same pattern. This is a complex page with polling logic and file upload handling.

- [ ] **Step 8: Commit**

```bash
git add src/pages/VoiceAsync/
git rm src/pages/VoiceAsync.tsx
git commit -m "refactor(pages): split VoiceAsync into module

- Extract TaskItem component
- Extract TextInputTab component
- Extract FileUploadTab component
- Extract ParameterSettings component
- Extract types and helpers
- From 965 to ~450 lines

Part of Phase 7 component splitting."
```

---

#### Task 7-9: Split VoiceSync.tsx

**Files:**
- Create: `src/pages/VoiceSync/GlassAudioPlayer.tsx` (~110 lines)
- Create: `src/pages/VoiceSync/VoiceWaveform.tsx` (~30 lines)
- Create: `src/pages/VoiceSync/ConfigPanel.tsx` (~150 lines)
- Create: `src/pages/VoiceSync/helpers.ts` (~25 lines)
- Modify: `src/pages/VoiceSync/index.tsx` (~420 lines, reduced from 733)
- Delete: `src/pages/VoiceSync.tsx` (after migration)
- Test: TypeScript compilation

**Agent Category:** visual-engineering

- [ ] **Step 1-7: Extract components**

Same pattern. GlassAudioPlayer is a reusable UI component.

- [ ] **Step 8: Commit**

```bash
git add src/pages/VoiceSync/
git rm src/pages/VoiceSync.tsx
git commit -m "refactor(pages): split VoiceSync into module

- Extract GlassAudioPlayer component
- Extract VoiceWaveform component
- Extract ConfigPanel component
- Extract helpers
- From 733 to ~420 lines

Part of Phase 7 component splitting."
```

---

#### Task 7-10: Split WorkflowMarketplace.tsx

**Files:**
- Create: `src/pages/WorkflowMarketplace/TemplateCard.tsx` (~100 lines)
- Create: `src/pages/WorkflowMarketplace/TemplateListItem.tsx` (~80 lines)
- Create: `src/pages/WorkflowMarketplace/helpers.ts` (~40 lines)
- Create: `src/pages/WorkflowMarketplace/types.ts` (~20 lines)
- Modify: `src/pages/WorkflowMarketplace/index.tsx` (~310 lines, reduced from 558)
- Delete: `src/pages/WorkflowMarketplace.tsx` (after migration)
- Test: TypeScript compilation

**Agent Category:** visual-engineering

- [ ] **Step 1-7: Extract components**

Same pattern. Depends on workflow-templates.ts (split in Task 7-1).

- [ ] **Step 8: Commit**

```bash
git add src/pages/WorkflowMarketplace/
git rm src/pages/WorkflowMarketplace.tsx
git commit -m "refactor(pages): split WorkflowMarketplace into module

- Extract TemplateCard component
- Extract TemplateListItem component
- Extract types and helpers
- From 558 to ~310 lines

Part of Phase 7 component splitting."
```

---

#### Task 7-11: Split ServiceNodeManagement.tsx

**Files:**
- Create: `src/pages/ServiceNodeManagement/CategorySection.tsx` (~95 lines)
- Create: `src/pages/ServiceNodeManagement/NodeCard.tsx` (~120 lines)
- Create: `src/pages/ServiceNodeManagement/StatCard.tsx` (~55 lines)
- Create: `src/pages/ServiceNodeManagement/helpers.ts` (~40 lines)
- Create: `src/pages/ServiceNodeManagement/types.ts` (~15 lines)
- Modify: `src/pages/ServiceNodeManagement/index.tsx` (~210 lines, reduced from 523)
- Delete: `src/pages/ServiceNodeManagement.tsx` (after migration)
- Test: TypeScript compilation

**Agent Category:** visual-engineering

- [ ] **Step 1-7: Extract components**

Same pattern.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ServiceNodeManagement/
git rm src/pages/ServiceNodeManagement.tsx
git commit -m "refactor(pages): split ServiceNodeManagement into module

- Extract CategorySection component
- Extract NodeCard component
- Extract StatCard component
- Extract types and helpers
- From 523 to ~210 lines

Part of Phase 7 component splitting."
```

---

## Final Verification & Integration

### Task FINAL-1: Full Build Verification

**Agent Category:** quick

- [ ] **Step 1: Run full TypeScript build**

```bash
cd /home/ogslp/Projects/Opencode/mnx-agent
npm run build 2>&1 | tail -30
# Expected: Build succeeds with no errors
```

- [ ] **Step 2: Run tests**

```bash
vitest run 2>&1 | tail -50
# Expected: All tests pass
```

- [ ] **Step 3: Verify file counts**

```bash
# Count files in each new module
find src/components/ui/Select -name "*.ts*" | wc -l
# Expected: 10 (9 + index)

find src/data/workflow-templates -name "*.ts" | wc -l
# Expected: 3

find src/pages -type d -name "*Queue\|*Codes\|*Management\|*Async\|*Sync\|*Marketplace" | wc -l
# Expected: 7 directories with index files
```

- [ ] **Step 4: Commit final verification**

```bash
git commit --allow-empty -m "chore: Phase 4-2 & Phase 7 completion verification

- All builds pass
- All tests pass
- TypeScript errors: 0
- Total new files: 45
- Total modified files: 12
- Deleted monolithic files: 11"
```

---

## Summary

| Phase | Tasks | Files In | Files Out | Duration | Agent |
|-------|-------|----------|-----------|----------|-------|
| 4-2 | 2 | 2 | 2 (modified) | 30 min | quick |
| 7-W1 | 2 | 2 | 6 (created) | 45 min | quick |
| 7-W2 | 2 | 2 | 11 (created) | 2 hrs | visual-engineering |
| 7-W3 | 7 | 7 | 38 (created) | 4-5 hrs | visual-engineering |
| **Total** | **13** | **13** | **57** | **7-8 hrs** | mixed |

### Commit Strategy

Each task produces **one atomic commit** with:
1. Clear commit message prefix (`refactor(api):`, `refactor(data):`, `refactor(ui):`, `refactor(pages):`)
2. Description of what was changed
3. Reference to Phase 4-2 or Phase 7

### Rollback Plan

If issues arise:
1. Each commit is self-contained and reversible via `git revert`
2. Wave 2 (Select.tsx) is the critical path - revert Wave 3 before Wave 2 if needed
3. Keep original files until final verification passes

### Execution Order

```
1. Phase 4-2 (parallel):     Task 4-2-1 + Task 4-2-2
2. Wave 1 (parallel):         Task 7-1 + Task 7-2
3. Wave 2 (sequential):       Task 7-3 → Task 7-4
4. Wave 3 (parallel):         Tasks 7-5 through 7-11 (all at once)
5. Final verification:        Task FINAL-1
```

---

## QA Checklist Per Task

Every task must pass:

- [ ] `npm run build` produces 0 TypeScript errors
- [ ] No import errors in browser console
- [ ] Component/page renders correctly
- [ ] All existing functionality preserved
- [ ] Git commit created with proper message
- [ ] Original file deleted (if applicable)

## Known Issues

1. **InvitationCodes.tsx**: Has misplaced import at line 726 - fix during Task 7-6
2. **Select.tsx**: Complex context sharing - test thoroughly after Task 7-3
3. **ActionConfigPanel.tsx**: Phase 4-2 modifies this file - ensure 4-2 commits first

---

*Plan created: 2026-04-09*
*Estimated completion: 7-8 hours with parallel execution*
