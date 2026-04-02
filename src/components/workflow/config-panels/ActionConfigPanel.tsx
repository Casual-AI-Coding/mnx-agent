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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  const categories = Object.keys(availableNodes)

  return (
    <div className="space-y-4">
      <div>
        <Label>Service</Label>
        <Select
          value={config.service}
          onValueChange={(service) => onChange({ service, method: '', args: [] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select service" />
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

      {config.service && availableNodes[config.service] && (
        <div>
          <Label>Method</Label>
          <Select
            value={config.method}
            onValueChange={(method) => onChange({ ...config, method, args: [] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {availableNodes[config.service]?.map(node => (
                <SelectItem key={node.method} value={node.method}>
                  {node.label}
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
