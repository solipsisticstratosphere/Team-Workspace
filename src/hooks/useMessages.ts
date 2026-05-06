import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Message, Profile } from '@/types/database'

export type MessageWithProfile = Message & { profile: Profile | null }

export function useMessages(projectId: string) {
  const [messages, setMessages] = useState<MessageWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const fetchMessages = async () => {
      const { data: msgsData } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (!msgsData?.length) {
        setMessages([])
        setLoading(false)
        setTimeout(scrollToBottom, 50)
        return
      }

      // messages.user_id FK points to auth.users (different schema),
      // so PostgREST can't auto-join profiles. Fetch separately.
      const userIds = [...new Set(msgsData.map((m) => m.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, updated_at')
        .in('id', userIds)

      const merged: MessageWithProfile[] = msgsData.map((m) => ({
        ...m,
        profile: profilesData?.find((p) => p.id === m.user_id) ?? null,
      }))

      setMessages(merged)
      setLoading(false)
      setTimeout(scrollToBottom, 50)
    }

    fetchMessages()

    const channel = supabase
      .channel(`messages:${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const newMsg = payload.new as Message
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, updated_at')
            .eq('id', newMsg.user_id)
            .single()
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, { ...newMsg, profile: profile ?? null }]
          })
          setTimeout(scrollToBottom, 50)
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [projectId, scrollToBottom])

  const sendMessage = useCallback(
    async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: new Error('Not authenticated') }
      const { error } = await supabase.from('messages').insert({
        project_id: projectId,
        user_id: user.id,
        content,
      })
      return { error }
    },
    [projectId]
  )

  return { messages, loading, sendMessage, bottomRef }
}
