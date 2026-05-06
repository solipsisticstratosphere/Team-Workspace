import { useState, type FormEvent } from 'react'
import { useMessages } from '@/hooks/useMessages'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  if (email) return email[0].toUpperCase()
  return '?'
}

export function ChatRoom({ projectId }: Props) {
  const { user } = useAuth()
  const { messages, loading, sendMessage, bottomRef } = useMessages(projectId)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    await sendMessage(text.trim())
    setText('')
    setSending(false)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === user?.id
            const name = msg.profile?.full_name
            const email = msg.profile?.email
            const initials = getInitials(name, email)
            const displayName = name ?? email ?? 'Unknown'

            return (
              <div
                key={msg.id}
                className={cn('flex items-end gap-2', isOwn && 'flex-row-reverse')}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className={cn('max-w-[70%]', isOwn && 'items-end flex flex-col')}>
                  {!isOwn && (
                    <p className="text-xs text-muted-foreground mb-1 ml-1">{displayName}</p>
                  )}
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all',
                        isOwn
                          ? 'bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground rounded-br-sm'
                          : 'glass text-foreground rounded-bl-sm'
                      )}
                    >
                    {msg.content}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mx-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t glass px-6 lg:px-8 py-4 mt-auto">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto">
          <Input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
            className="flex-1 rounded-full px-5 shadow-inner"
          />
          <Button type="submit" size="icon" disabled={sending || !text.trim()} className="rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-primary to-indigo-600 border-0 h-10 w-10 flex items-center justify-center">
            {sending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
