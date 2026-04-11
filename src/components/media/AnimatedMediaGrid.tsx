import { motion, AnimatePresence } from 'framer-motion'
import { MediaCard } from './MediaCard'
import {
  gridContainerVariants,
  cardVariants,
  getRandomFlyInDirection,
} from '@/lib/animations/media-variants'
import type { MediaRecord } from '@/types/media'

interface AnimatedMediaGridProps {
  records: MediaRecord[]
  signedUrls: Record<string, string>
  selectedIds: Set<string>
  onSelect: (id: string) => void
  onPreview: (record: MediaRecord) => void
  onDownload: (record: MediaRecord) => void
  onDelete: (record: MediaRecord) => void
  onRename?: (id: string, newName: string) => void
}

export function AnimatedMediaGrid({
  records,
  signedUrls,
  selectedIds,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
  onRename,
}: AnimatedMediaGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      variants={gridContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {records.map((record) => (
          <motion.div
            key={record.id}
            layout
            custom={getRandomFlyInDirection()}
            variants={cardVariants}
          >
            <MediaCard
              record={record}
              signedUrl={signedUrls[record.id]}
              isSelected={selectedIds.has(record.id)}
              onSelect={() => onSelect(record.id)}
              onPreview={() => onPreview(record)}
              onDownload={() => onDownload(record)}
              onDelete={() => onDelete(record)}
              onRename={onRename}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
