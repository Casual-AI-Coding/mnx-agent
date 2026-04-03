import * as React from 'react'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface SaveWorkflowModalProps {
  isOpen: boolean
  onSave: (name: string) => void
  onClose: () => void
}

export function SaveWorkflowModal({ isOpen, onSave, onClose }: SaveWorkflowModalProps) {
  const [name, setName] = React.useState('')
  const [error, setError] = React.useState('')

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    onSave(name.trim())
    setName('')
    setError('')
  }

  const handleClose = () => {
    setName('')
    setError('')
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title="Save Workflow"
      size="sm"
    >
      <DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="workflow-name">Workflow Name</Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="Enter workflow name"
              variant={error ? 'error' : 'default'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave()
                }
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
