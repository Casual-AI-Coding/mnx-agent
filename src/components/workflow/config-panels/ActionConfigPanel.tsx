import { useState, useEffect } from 'react'
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

export function ActionConfigPanel({ config, onChange }: ActionConfigPanelProps) {
  const [availableNodes, setAvailableNodes] = useState<GroupedActionNodes>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableNodes = () => {
    setLoading(true)
    setError(null)
    fetch('/api/workflows/available-actions')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setAvailableNodes(data.data)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load available actions:', err)
        setError('Failed to load available actions')
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchAvailableNodes()
  }, [])

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  if (error) {
    return (
      <div className="p-4 space-y-2">
        <div className="text-sm text-destructive">{error}</div>
        <button onClick={fetchAvailableNodes} className="text-sm text-primary hover:underline">
          Retry
        </button>
      </div>
    )
  }

  const categories = Object.keys(availableNodes)

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
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCategory && availableNodes[selectedCategory] && (
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
              {availableNodes[selectedCategory]?.map(node => (
                <SelectItem key={`${node.service}.${node.method}`} value={`${node.service}.${node.method}`}>
                  {node.label} ({node.service}.{node.method})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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