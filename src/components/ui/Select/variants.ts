import { cva } from 'class-variance-authority'

export const selectTriggerVariants = cva(
  'flex items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
  {
    variants: {
      size: {
        default: 'h-9 px-3 py-2',
        sm: 'h-8 px-3 py-2 text-xs',
        lg: 'h-10 px-4 py-2',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

export const selectContentVariants = cva(
  'relative z-50 max-h-60 min-w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export const selectItemVariants = cva(
  'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)
