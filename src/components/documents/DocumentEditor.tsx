import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Document } from '@/types/database'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  doc: Document
  onUpdate: (doc: Document) => void
}

export function DocumentEditor({ doc, onUpdate }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState(doc.content ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTitle(doc.title)
    setContent(doc.content ?? '')
    setSaveStatus('idle')
  }, [doc.id])

  const save = useCallback(
    async (newTitle: string, newContent: string) => {
      if (doc.is_archived) return
      setSaveStatus('saving')
      const { data } = await supabase
        .from('documents')
        .update({ title: newTitle, content: newContent, updated_by: user?.id })
        .eq('id', doc.id)
        .select()
        .single()
      if (data) {
        onUpdate(data)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    },
    [doc.id, doc.is_archived, user?.id, onUpdate]
  )

  const schedulesSave = (newTitle: string, newContent: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(newTitle, newContent), 800)
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    schedulesSave(value, content)
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    schedulesSave(title, value)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b px-6 py-2 flex items-center justify-between">
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="border-none shadow-none text-lg font-semibold px-0 focus-visible:ring-0 h-auto"
            placeholder="Document title"
            disabled={doc.is_archived}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>Saved</span>
            </>
          )}
          {doc.is_archived && (
            <span className="text-yellow-600 font-medium">Archived — read only</span>
          )}
        </div>
      </div>

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Start writing..."
        disabled={doc.is_archived}
        className="flex-1 resize-none p-6 text-sm leading-relaxed focus:outline-none bg-background disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  )
}
