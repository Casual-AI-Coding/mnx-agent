import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  ListTodo,
  Plus,
  Play,
  Pause,
  Edit3,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Card,
  CardContent,
} from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import {
  useCronJobsStore,
} from '@/stores/cronJobs'
import { useWorkflowTemplatesStore } from '@/stores/workflowTemplates'
import { useTaskQueueStore } from '@/stores/taskQueue'
import { useCronJobsWebSocket } from '@/hooks/useCronJobsWebSocket'
import { useTaskQueueWebSocket } from '@/hooks/useTaskQueueWebSocket'
import { useExecutionLogsWebSocket } from '@/hooks/useExecutionLogsWebSocket'
import type {
  CronJob,
  TaskQueueItem,
  CreateCronJobDTO,
  UpdateCronJobDTO,
} from '@/types/cron'
import {
  getCronDescription,
  getNextRuns,
  COMMON_TIMEZONES,
  getLocalTimezone,
  formatDateWithTimezone,
} from '@/lib/cron-utils'
import { CronExpressionBuilder } from '@/components/cron/CronExpressionBuilder'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormError } from '@/components/ui/FormError'
import { cronJobSchema, type CronJobFormData } from '@/lib/form-schemas'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ServiceIcon } from '@/components/shared/ServiceIcon'
import { JsonViewer } from '@/components/shared/JsonViewer'
import { formatDate, formatDuration } from '@/components/shared/dateUtils'

export { StatusBadge, ServiceIcon, JsonViewer, formatDate, formatDuration }
