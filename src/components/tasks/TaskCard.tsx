import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

const priorityConfig = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  high: { label: 'High', className: 'bg-red-50 text-red-700 border-red-200' },
}

interface Props {
  task: Task
  isDragging?: boolean
  onEdit?: (task: Task) => void
  onDelete?: (id: string) => void
}

export function TaskCard({ task, isDragging, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = priorityConfig[task.priority]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card rounded-md border p-3 shadow-sm group',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="mt-2">
            <Badge variant="outline" className={cn('text-xs', priority.className)}>
              {priority.label}
            </Badge>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
