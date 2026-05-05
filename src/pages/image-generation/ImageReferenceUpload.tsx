import type { ChangeEvent } from 'react'
import { Link, Upload, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

interface ImageReferenceUploadProps {
  clickToUploadText: string
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onModeChange: (mode: 'upload' | 'url') => void
  onRegisterFileInput: (element: HTMLInputElement | null) => void
  onReferenceImageUrlChange: (value: string) => void
  onRemoveReferenceImage: () => void
  onTriggerFileSelect: () => void
  onUseUrl: () => void
  optionalLabel: string
  referenceImage: string | null
  referenceImageMode: 'upload' | 'url'
  referenceImageUrl: string
  referenceLabel: string
  uploadTabLabel: string
  urlPlaceholder: string
  urlTabLabel: string
  useUrlButtonLabel: string
}

export function ImageReferenceUpload({
  clickToUploadText,
  onFileUpload,
  onModeChange,
  onRegisterFileInput,
  onReferenceImageUrlChange,
  onRemoveReferenceImage,
  onTriggerFileSelect,
  onUseUrl,
  optionalLabel,
  referenceImage,
  referenceImageMode,
  referenceImageUrl,
  referenceLabel,
  uploadTabLabel,
  urlPlaceholder,
  urlTabLabel,
  useUrlButtonLabel,
}: ImageReferenceUploadProps) {
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/10 via-primary/10 to-secondary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-secondary-foreground" />
            <span className="text-sm font-medium text-foreground">{referenceLabel}</span>
          </div>
          <span className="text-xs text-muted-foreground">{optionalLabel}</span>
        </div>
        <div className="p-4">
          {referenceImage ? (
            <div className="relative group/image">
              <img
                src={referenceImage}
                alt="Reference"
                className="w-full max-h-48 object-contain rounded-lg border border-border/50"
              />
              <button
                onClick={onRemoveReferenceImage}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 text-muted-foreground/70 hover:text-destructive hover:bg-card transition-colors opacity-0 group-hover/image:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Tabs value={referenceImageMode} onValueChange={v => onModeChange(v as 'upload' | 'url')}>
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadTabLabel}
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1">
                  <Link className="w-4 h-4 mr-2" />
                  {urlTabLabel}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-4">
                <div
                  onClick={onTriggerFileSelect}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group/upload"
                >
                  <div className="relative mx-auto w-12 h-12 mb-3">
                    <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full group-hover/upload:blur-2xl transition-all" />
                    <Upload className="w-12 h-12 relative text-muted-foreground/50 group-hover/upload:text-accent-foreground transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/70 group-hover/upload:text-foreground transition-colors">
                    {clickToUploadText}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1">JPG, PNG</p>
                  <input ref={onRegisterFileInput} type="file" accept="image/*" onChange={onFileUpload} className="hidden" />
                </div>
              </TabsContent>

              <TabsContent value="url" className="mt-4">
                <div className="space-y-3">
                  <Input
                    value={referenceImageUrl}
                    onChange={e => onReferenceImageUrlChange(e.target.value)}
                    placeholder={urlPlaceholder}
                    className="w-full bg-background/50 border-border"
                  />
                  <button
                    onClick={onUseUrl}
                    disabled={!referenceImageUrl.trim()}
                    className="w-full py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {useUrlButtonLabel}
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
