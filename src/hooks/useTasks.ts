import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/database'

export function useTasks(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    setTasks(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchTasks()

    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => {
              if (prev.some((t) => t.id === (payload.new as Task).id)) return prev
              return [...prev, payload.new as Task]
            })
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) => prev.map((t) => (t.id === (payload.new as Task).id ? (payload.new as Task) : t)))
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== (payload.old as Task).id))
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [projectId, fetchTasks])

  const createTask = useCallback(
    async (data: { title: string; description?: string; priority?: Task['priority']; assigned_to?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('tasks').insert({
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? 'medium',
        assigned_to: data.assigned_to ?? null,
        project_id: projectId,
        created_by: user?.id ?? null,
      })
      return { error }
    },
    [projectId]
  )

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) {
      void fetchTasks()
    }
    return { error }
  }, [fetchTasks])

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    return { error }
  }, [])

  return { tasks, loading, createTask, updateTask, deleteTask }
}
