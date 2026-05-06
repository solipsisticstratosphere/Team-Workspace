import { useState, type SyntheticEvent } from 'react'
import { useProjectMembers } from '@/hooks/useProjectMembers'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserPlus, Trash2, Crown, AlertCircle } from 'lucide-react'

interface Props {
  projectId: string
  userRole: 'admin' | 'member' | null
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  if (email) return email[0].toUpperCase()
  return '?'
}

export function ProjectSettings({ projectId, userRole }: Props) {
  const { user } = useAuth()
  const { members, loading, error: membersError, addMember, updateRole, removeMember } = useProjectMembers(projectId)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const handleInvite = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setInviteError(null)
    setInviting(true)
    const { error } = await addMember(inviteEmail, inviteRole)
    if (error) setInviteError((error as Error).message)
    else setInviteEmail('')
    setInviting(false)
  }

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    setActionError(null)
    setPendingUserId(userId)
    const { error } = await updateRole(userId, role)
    if (error) setActionError((error as Error).message)
    setPendingUserId(null)
  }

  const handleRemove = async (userId: string) => {
    setActionError(null)
    setPendingUserId(userId)
    const { error } = await removeMember(userId)
    if (error) setActionError((error as Error).message)
    setPendingUserId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {(membersError || actionError) && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {membersError ?? actionError}
        </div>
      )}

      <Card className="glass-panel overflow-hidden border-0 ring-1 ring-border/50 shadow-xl">
        <CardHeader className="bg-primary/5 border-b border-border/50 pb-6">
          <CardTitle className="text-xl">Project Members</CardTitle>
          <CardDescription>
            Manage who has access to this project ({members.length} member{members.length !== 1 ? 's' : ''})
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Members list */}
          <div className="divide-y divide-border/50">
            {members.map((member) => {
              const isSelf = member.user_id === user?.id
              const name = member.profile?.full_name
              const email = member.profile?.email ?? member.user_id
              const initials = getInitials(name, email)
              const isPending = pendingUserId === member.user_id

              return (
                <div key={member.user_id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-indigo-500/20 text-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name ?? email}</p>
                    {name && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                  </div>
                  {member.role === 'admin' && (
                    <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                      <Crown className="h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                  {userRole === 'admin' && !isSelf && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        disabled={isPending}
                        onValueChange={(v) => handleRoleChange(member.user_id, v as 'admin' | 'member')}
                      >
                        <SelectTrigger className="h-9 w-32 bg-background/50 backdrop-blur-sm">
                          {isPending
                            ? <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                            : <SelectValue />
                          }
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                        disabled={isPending}
                        onClick={() => handleRemove(member.user_id)}
                      >
                        {isPending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  )}
                  {isSelf && (
                    <Badge variant="outline" className="text-xs bg-background/50">You</Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {userRole === 'admin' && (
        <Card className="glass border-0 ring-1 ring-border/50 shadow-lg mt-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-indigo-500/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 pointer-events-none"></div>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <UserPlus className="h-4 w-4" />
              </div>
              Invite New Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="inviteEmail" className="text-xs uppercase tracking-wider text-muted-foreground">Email address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2 w-full sm:w-32">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}>
                  <SelectTrigger className="h-11 w-full sm:w-32 bg-background/50 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviting} className="h-11 w-full sm:w-auto px-8 bg-gradient-to-r from-primary to-indigo-600 shadow-md hover:shadow-lg transition-all">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}
              </Button>
            </form>
            {inviteError && <p className="text-sm text-destructive mt-3">{inviteError}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
