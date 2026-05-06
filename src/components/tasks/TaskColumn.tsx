import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task, TaskStatus } from '@/types/database'
import { TaskCard } from './TaskCard'
import { cn } from '@/lib/utils'

interface Props {
  id: TaskStatus
  label: string
  colorClass: string
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete?: (id: string) => void
}

export function TaskColumn({ id, label, colorClass, tasks, onEdit, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border-t-4 bg-muted/30 min-h-[200px] transition-colors',
        colorClass,
        isOver && 'bg-muted/60'
      )}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium text-sm">{label}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-3 pb-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
