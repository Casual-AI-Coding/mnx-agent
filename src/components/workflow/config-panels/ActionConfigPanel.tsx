import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { FieldBuilder } from './FieldBuilder'
import { ACTION_FIELDS } from './action-fields'
import { ActionNodeConfig, GroupedActionNodes } from '@/types/cron'
import { useAuthStore } from '@/stores/auth'
import { fetchAvailableActions } from '@/lib/api/workflow-actions'

interface ActionConfigPanelProps {
  config: ActionNodeConfig
  onChange: (config: ActionNodeConfig) => void
}

export function ActionConfigPanel({ config, onChange }: ActionConfigPanelProps) {
  const [availableNodes, setAvailableNodes] = useState<GroupedActionNodes>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { isHydrated } = useAuthStore()
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (!isHydrated || hasInitializedRef.current) return
    hasInitializedRef.current = true

    fetchAvailableActions()
      .then(setAvailableNodes)
      .catch(err => {
        console.error('Failed to load available actions:', err)
        setError('Failed to load available actions')
      })
      .finally(() => setLoading(false))
  }, [isHydrated])

  const fieldDefinitions = useMemo(() => {
    const { service, method } = config
    if (!service || !method) return []
    return ACTION_FIELDS[service]?.[method] || []
  }, [config])

  const paramValues = useMemo(() => {
    const args = config.args || []
    return (args[0] as Record<string, unknown>) || {}
  }, [config.args])

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return Object.keys(availableNodes)
    }
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

  const handleFieldChange = (name: string, value: unknown) => {
    const newParams = { ...paramValues, [name]: value }
    onChange({
      ...config,
      args: [newParams]
    })
  }

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

      {fieldDefinitions.length > 0 && (
        <div className="border-t border-border pt-4 mt-4">
          <Label className="text-sm font-medium mb-3 block">Configuration</Label>
          <FieldBuilder
            fields={fieldDefinitions}
            values={paramValues}
            onChange={handleFieldChange}
          />
        </div>
      )}

      {config.service && config.method && fieldDefinitions.length === 0 && (
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
          <p className="text-xs text-muted-foreground mt-1">
            此服务/方法组合暂无表单配置，请使用 JSON 格式
          </p>
        </div>
      )}
    </div>
  )
}
