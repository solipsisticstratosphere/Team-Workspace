import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Document } from '@/types/database'
import { DocumentEditor } from './DocumentEditor'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Archive, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
  userRole: 'admin' | 'member' | null
}

export function DocumentsTab({ projectId, userRole }: Props) {
  const { user } = useAuth()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [creating, setCreating] = useState(false)

  const fetchDocs = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
    setDocs(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const createDoc = async () => {
    setCreating(true)
    const { data, error } = await supabase
      .from('documents')
      .insert({ project_id: projectId, title: 'Untitled', updated_by: user!.id })
      .select()
      .single()
    if (!error && data) {
      setDocs((prev) => [data, ...prev])
      setSelectedDoc(data)
    }
    setCreating(false)
  }

  const handleDocUpdate = (updated: Document) => {
    setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    setSelectedDoc(updated)
  }

  const toggleArchive = async (doc: Document) => {
    if (userRole !== 'admin') return
    const { data } = await supabase
      .from('documents')
      .update({ is_archived: !doc.is_archived })
      .eq('id', doc.id)
      .select()
      .single()
    if (data) {
      setDocs((prev) => prev.map((d) => (d.id === data.id ? data : d)))
      if (selectedDoc?.id === data.id) setSelectedDoc(data)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-112px)]">
      {/* Sidebar */}
      <div className="w-60 border-r flex flex-col shrink-0">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium">Documents</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createDoc} disabled={creating}>
            {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {docs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No documents yet</p>
          )}
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={cn(
                'w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group',
                selectedDoc?.id === doc.id ? 'bg-accent' : 'hover:bg-muted',
                doc.is_archived && 'opacity-50'
              )}
            >
              {doc.is_archived ? (
                <Archive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate flex-1">{doc.title || 'Untitled'}</span>
              {userRole === 'admin' && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleArchive(doc) }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                  title={doc.is_archived ? 'Unarchive' : 'Archive'}
                >
                  <Archive className="h-3 w-3" />
                </button>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {selectedDoc ? (
          <DocumentEditor doc={selectedDoc} onUpdate={handleDocUpdate} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a document or create a new one
          </div>
        )}
      </div>
    </div>
  )
}
