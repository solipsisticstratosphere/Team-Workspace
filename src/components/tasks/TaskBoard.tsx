import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useTasks } from '@/hooks/useTasks'
import type { Task, TaskStatus } from '@/types/database'
import { TaskColumn } from './TaskColumn'
import { TaskCard } from './TaskCard'
import { TaskModal } from './TaskModal'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'border-slate-300' },
  { id: 'in_progress', label: 'In Progress', color: 'border-blue-400' },
  { id: 'done', label: 'Done', color: 'border-green-400' },
]

interface Props {
  projectId: string
  userRole: 'admin' | 'member' | null
}

export function TaskBoard({ projectId, userRole }: Props) {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks(projectId)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    let newStatus = over.id as string

    // If dropped over another task instead of a column, use the target task's status
    if (newStatus !== 'todo' && newStatus !== 'in_progress' && newStatus !== 'done') {
      const overTask = tasks.find((t) => t.id === newStatus)
      if (overTask) {
        newStatus = overTask.status
      } else {
        return
      }
    }

    const task = tasks.find((t) => t.id === active.id)
    if (task && task.status !== newStatus) {
      await updateTask(task.id, { status: newStatus as TaskStatus })
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Tasks</h2>
        <Button onClick={() => { setEditingTask(null); setShowModal(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          New task
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {COLUMNS.map((col) => (
            <TaskColumn
              key={col.id}
              id={col.id}
              label={col.label}
              colorClass={col.color}
              tasks={tasks.filter((t) => t.status === col.id)}
              onEdit={handleEdit}
              onDelete={userRole === 'admin' ? deleteTask : undefined}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={showModal}
        onOpenChange={(open) => { setShowModal(open); if (!open) setEditingTask(null) }}
        projectId={projectId}
        task={editingTask}
        onCreate={createTask}
        onUpdate={updateTask}
      />
    </div>
  )
}
