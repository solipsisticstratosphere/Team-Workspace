import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProjectMember, Profile } from '@/types/database'

export type MemberWithProfile = ProjectMember & { profile: Profile | null }

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setError(null)

    const { data: membersData, error: membersError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (membersError) {
      setError(membersError.message)
      setLoading(false)
      return
    }

    if (!membersData?.length) {
      setMembers([])
      setLoading(false)
      return
    }

    // project_members.user_id FK points to auth.users (different schema),
    // so PostgREST can't auto-join profiles. Fetch separately.
    const userIds = membersData.map((m) => m.user_id)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, updated_at')
      .in('id', userIds)

    const merged: MemberWithProfile[] = membersData.map((m) => ({
      ...m,
      profile: profilesData?.find((p) => p.id === m.user_id) ?? null,
    }))

    setMembers(merged)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchMembers()

    const channel = supabase
      .channel(`project_members:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${projectId}` },
        () => fetchMembers()
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [projectId, fetchMembers])

  const addMember = useCallback(
    async (email: string, role: 'admin' | 'member' = 'member') => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()
      if (profileError || !profile) return { error: new Error('User not found') }

      const { error } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: profile.id,
        role,
      })
      if (!error) fetchMembers()
      return { error }
    },
    [projectId, fetchMembers]
  )

  const updateRole = useCallback(
    async (userId: string, role: 'admin' | 'member') => {
      const { error } = await supabase
        .from('project_members')
        .update({ role })
        .eq('project_id', projectId)
        .eq('user_id', userId)
      if (!error) fetchMembers()
      return { error }
    },
    [projectId, fetchMembers]
  )

  const removeMember = useCallback(
    async (userId: string) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId)
      if (!error) setMembers((prev) => prev.filter((m) => m.user_id !== userId))
      return { error }
    },
    [projectId]
  )

  return { members, loading, error, addMember, updateRole, removeMember, refetch: fetchMembers }
}
