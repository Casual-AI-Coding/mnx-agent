import { Globe, Key, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ComboboxInput } from '@/components/ui/ComboboxInput'
import { Tooltip } from '@/components/ui/Tooltip'
import type { OpenAIImage2FormData } from './types'

interface EndpointOption {
  value: string
  label: string
  id: string
}

interface Props {
  formData: OpenAIImage2FormData
  updateForm: (updates: Partial<OpenAIImage2FormData>) => void
  isBusy: boolean
  baseUrlOptions: EndpointOption[]
}

export function ConnectionConfigCard({ formData, updateForm, isBusy, baseUrlOptions }: Props) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="w-4 h-4 text-indigo-500" />
          连接配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">Base URL</Label>
          <ComboboxInput
            value={formData.baseUrl}
            selectedId={formData.endpointId}
            onChange={(v, id) => updateForm({ baseUrl: v, endpointId: id ?? '' })}
            options={baseUrlOptions}
            suffix="/v1/images/generations"
            placeholder="https://api.example.com"
            disabled={isBusy}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Bearer Token</Label>
            <Tooltip content="从设置中的外部 API 端点自动填充，也可临时修改" side="top">
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </Tooltip>
          </div>
          <div className="relative flex-1">
            <Input
              type="password"
              value={formData.bearerToken}
              onChange={e => updateForm({ bearerToken: e.target.value })}
              placeholder="sk-..."
              disabled={isBusy}
              className="pr-10"
            />
            <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
