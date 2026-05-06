import { Settings2, Loader2, Wand2 } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { SizePopup } from '@/components/ui/SizePopup'
import type { OpenAIImage2FormData, ResultStatus } from './types'
import {
  MODEL_OPTIONS,
  QUALITY_OPTIONS,
  BACKGROUND_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  MODERATION_OPTIONS,
  STATUS_LABELS,
} from './types'
import { useState } from 'react'

interface Props {
  formData: OpenAIImage2FormData
  updateForm: (updates: Partial<OpenAIImage2FormData>) => void
  isBusy: boolean
  resultStatus: ResultStatus
  onGenerate: () => void
}

export function GenerationParamsCard({ formData, updateForm, isBusy, resultStatus, onGenerate }: Props) {
  const [sizePopupOpen, setSizePopupOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="w-4 h-4 text-indigo-500" />
          生成参数
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            value={formData.prompt}
            onChange={e => updateForm({ prompt: e.target.value })}
            placeholder="描述你想生成的图像..."
            rows={12}
            disabled={isBusy}
            className="text-xs"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="space-y-1 flex-1 min-w-[140px]">
            <Label className="text-xs font-medium text-muted-foreground">Model</Label>
            <Select value={formData.model} onValueChange={v => updateForm({ model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative space-y-1 flex-1 min-w-[140px]">
            <Label className="text-xs font-medium text-muted-foreground">Size</Label>
            <button
              type="button"
              onClick={() => setSizePopupOpen(true)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden"
            >
              <span className="line-clamp-1">{formData.size}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50 shrink-0">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <SizePopup
              open={sizePopupOpen}
              onClose={() => setSizePopupOpen(false)}
              value={formData.size}
              onChange={v => updateForm({ size: v })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Quality</Label>
            <Select value={formData.quality} onValueChange={v => updateForm({ quality: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3 [&>*]:min-w-0">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Background</Label>
            <Select value={formData.background} onValueChange={v => updateForm({ background: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BACKGROUND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Format</Label>
            <Select value={formData.outputFormat} onValueChange={v => updateForm({ outputFormat: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTPUT_FORMAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Moderation</Label>
            <Select value={formData.moderation} onValueChange={v => updateForm({ moderation: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODERATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">数量</Label>
            <Select value={String(formData.n)} onValueChange={v => updateForm({ n: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">重试次数</Label>
            <Select value={String(formData.retryCount)} onValueChange={v => updateForm({ retryCount: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-end">
          <Button
            className="w-full h-11 text-base font-medium bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-lg shadow-indigo-500/25"
            onClick={onGenerate}
            disabled={isBusy || !formData.prompt.trim() || !formData.bearerToken.trim()}
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-1.5" />
            )}
            {isBusy ? STATUS_LABELS[resultStatus] : '生成'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
