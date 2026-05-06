import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Project } from '@/types/database'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { ChatRoom } from '@/components/chat/ChatRoom'
import { DocumentsTab } from '@/components/documents/DocumentsTab'
import { ProjectSettings } from '@/components/settings/ProjectSettings'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Kanban, MessageSquare, FileText, Settings, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'tasks' | 'chat' | 'documents' | 'settings'

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('tasks')
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null)

  useEffect(() => {
    if (!id || !user) return
    const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('*').eq('id', id).single()
      if (!data) { navigate('/'); return }
      setProject(data)

      const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .single()
      setUserRole(member?.role ?? null)
      setLoading(false)
    }
    fetchProject()
  }, [id, user, navigate])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'tasks', label: 'Tasks', icon: <Kanban className="h-4 w-4" /> },
    { key: 'chat', label: 'Chat', icon: <MessageSquare className="h-4 w-4" /> },
    { key: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
    { key: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen opacity-50 pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b glass">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="hover:bg-primary/10">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">{project.name}</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b glass/80 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex gap-2">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all duration-200',
                tab === key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <div className={cn("p-1.5 rounded-md transition-colors", tab === key ? "bg-primary/10" : "")}>
                {icon}
              </div>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'tasks' && <TaskBoard projectId={id!} userRole={userRole} />}
        {tab === 'chat' && <ChatRoom projectId={id!} />}
        {tab === 'documents' && <DocumentsTab projectId={id!} userRole={userRole} />}
        {tab === 'settings' && <ProjectSettings projectId={id!} userRole={userRole} />}
      </div>
    </div>
  )
}
