import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { ActionNodeConfig, GroupedActionNodes } from '@/types/cron'

interface ActionConfigPanelProps {
  config: ActionNodeConfig
  onChange: (config: ActionNodeConfig) => void
}

// Module-level cache for available actions
const actionsCache: {
  data: GroupedActionNodes | null
  timestamp: number
  promise: Promise<GroupedActionNodes> | null
} = {
  data: null,
  timestamp: 0,
  promise: null,
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchAvailableActions(): Promise<GroupedActionNodes> {
  const now = Date.now()

  // Return cached data if within TTL
  if (actionsCache.data && (now - actionsCache.timestamp) < CACHE_TTL) {
    return actionsCache.data
  }

  // Return existing promise if fetch is in progress
  if (actionsCache.promise) {
    return actionsCache.promise
  }

  // Create new fetch promise
  actionsCache.promise = fetch('/api/workflows/available-actions')
    .then(r => r.json())
    .then(data => {
      if (data.success && data.data) {
        actionsCache.data = data.data
        actionsCache.timestamp = now
        return data.data
      }
      throw new Error('Failed to load available actions')
    })
    .finally(() => {
      actionsCache.promise = null
    })

  return actionsCache.promise
}

export function ActionConfigPanel({ config, onChange }: ActionConfigPanelProps) {
  const [availableNodes, setAvailableNodes] = useState<GroupedActionNodes>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAvailableActions()
      .then(setAvailableNodes)
      .catch(err => {
        console.error('Failed to load available actions:', err)
        setError('Failed to load available actions')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return Object.keys(availableNodes)
    }
    // Filter categories based on search query
    return Object.keys(availableNodes).filter(category => {
      const nodes = availableNodes[category]
      return nodes.some(
        node =>
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.method.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [availableNodes, searchQuery])

  const filteredNodes = useMemo(() => {
    if (!selectedCategory || !availableNodes[selectedCategory]) {
      return []
    }
    if (!searchQuery.trim()) {
      return availableNodes[selectedCategory]
    }
    return availableNodes[selectedCategory].filter(
      node =>
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.method.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [availableNodes, selectedCategory, searchQuery])

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  if (error) {
    return (
      <div className="p-4 space-y-2">
        <div className="text-sm text-destructive">{error}</div>
        <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Category</Label>
        <Select value={selectedCategory} onValueChange={(category) => {
          setSelectedCategory(category)
          onChange({ service: '', method: '', args: [] })
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCategory && (
        <>
          <div>
            <Label>Search Actions</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, service, or method..."
              className="text-sm"
            />
          </div>

          <div>
            <Label>Action</Label>
            <Select
              value={config.service && config.method ? `${config.service}.${config.method}` : ''}
              onValueChange={(value) => {
                const [service, method] = value.split('.')
                const node = availableNodes[selectedCategory]?.find(n => n.service === service && n.method === method)
                onChange({
                  service,
                  method,
                  args: [],
                  label: node?.label
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                {filteredNodes.map(node => (
                  <SelectItem key={`${node.service}.${node.method}`} value={`${node.service}.${node.method}`}>
                    {node.label} ({node.service}.{node.method})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div>
        <Label>Arguments (JSON)</Label>
        <Input
          value={JSON.stringify(config.args || [])}
          onChange={(e) => {
            try {
              const args = JSON.parse(e.target.value)
              onChange({ ...config, args })
            } catch {
              onChange({ ...config })
            }
          }}
          placeholder="[]"
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}