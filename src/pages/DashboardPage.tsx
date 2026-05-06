import { useEffect, useState, useCallback, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Organization, Project } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, FolderOpen, Building2, LogOut, Loader2, Trash2 } from 'lucide-react'

type OrgWithProjects = Organization & { projects: Project[] }
type ConfirmTarget = { type: 'project' | 'org'; id: string; name: string }

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState<OrgWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  // project IDs where the current user is admin
  const [projectAdminIds, setProjectAdminIds] = useState<Set<string>>(new Set())

  const [showOrgDialog, setShowOrgDialog] = useState(false)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<ConfirmTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: orgMembers } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user!.id)

    if (!orgMembers?.length) { setLoading(false); return }

    const orgIds = orgMembers.map((m) => m.org_id)
    const { data: orgsData } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)

    const { data: projectMembers } = await supabase
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', user!.id)

    const adminIds = new Set(
      (projectMembers ?? []).filter((m) => m.role === 'admin').map((m) => m.project_id)
    )
    setProjectAdminIds(adminIds)

    const projectIds = (projectMembers ?? []).map((m) => m.project_id)
    const { data: projectsData } = projectIds.length
      ? await supabase.from('projects').select('*').in('id', projectIds)
      : { data: [] }

    const merged = (orgsData ?? []).map((org) => ({
      ...org,
      projects: (projectsData ?? []).filter((p) => p.org_id === org.id),
    }))
    setOrgs(merged)
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) fetchData() }, [user, fetchData])

  const createOrg = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaveError(null)
    setSaving(true)
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name: orgName, owner_id: user!.id })
      .select()
      .single()
    if (error || !data) {
      setSaveError(error?.message ?? 'Failed to create organization')
      setSaving(false)
      return
    }
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({ org_id: data.id, user_id: user!.id, role: 'owner' })
    if (memberError) {
      setSaveError(memberError.message)
      setSaving(false)
      return
    }
    setOrgName('')
    setShowOrgDialog(false)
    fetchData()
    setSaving(false)
  }

  const createProject = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedOrgId) return
    setSaveError(null)
    setSaving(true)

    // Step 1: insert the project row
    const { error } = await supabase
      .from('projects')
      .insert({ name: projectName, org_id: selectedOrgId })

    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }

    // Step 2: fetch the new project ID in a separate query.
    // Doing .insert().select().single() can fail when the SELECT RLS evaluates
    // before the AFTER-INSERT trigger has added the creator to project_members.
    const { data: created } = await supabase
      .from('projects')
      .select('id')
      .eq('org_id', selectedOrgId)
      .eq('name', projectName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (created?.id) {
      // Step 3: make creator a project admin.
      // Migration 006 RLS allows an org-member to insert themselves.
      // If the DB trigger (migration 008) already ran we get a 23505 duplicate
      // that we safely ignore; any other error we log but don't block the user.
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({ project_id: created.id, user_id: user!.id, role: 'admin' })
      if (memberError && memberError.code !== '23505') {
        console.warn('project_members insert:', memberError.message)
      }
    }

    setProjectName('')
    setShowProjectDialog(false)
    fetchData()
    setSaving(false)
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return
    setDeleting(true)

    if (confirmDelete.type === 'project') {
      await supabase.from('projects').delete().eq('id', confirmDelete.id)
    } else {
      await supabase.from('organizations').delete().eq('id', confirmDelete.id)
    }

    setConfirmDelete(null)
    setDeleting(false)
    fetchData()
  }

  const openProjectDialog = (orgId: string) => {
    setSaveError(null)
    setSelectedOrgId(orgId)
    setShowProjectDialog(true)
  }

  const openOrgDialog = () => {
    setSaveError(null)
    setShowOrgDialog(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Team Workspace</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your workspace</h2>
          <Button onClick={openOrgDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New organization
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No organizations yet</p>
            <p className="text-sm mt-1">Create your first organization to get started</p>
          </div>
        ) : (
          <div className="space-y-8">
            {orgs.map((org) => {
              const isOrgOwner = org.owner_id === user?.id
              return (
                <div key={org.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">{org.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOrgOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete organization"
                          onClick={() => setConfirmDelete({ type: 'org', id: org.id, name: org.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openProjectDialog(org.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New project
                      </Button>
                    </div>
                  </div>

                  {org.projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-7">No projects yet</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {org.projects.map((project) => (
                        <Card
                          key={project.id}
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-primary" />
                              <span className="flex-1 truncate">{project.name}</span>
                              {projectAdminIds.has(project.id) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Delete project"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setConfirmDelete({ type: 'project', id: project.id, name: project.name })
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </CardTitle>
                            {project.description && (
                              <CardDescription className="text-xs line-clamp-2">
                                {project.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground">
                              Created {new Date(project.created_at).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Create org dialog */}
      <Dialog open={showOrgDialog} onOpenChange={(open) => { setShowOrgDialog(open); if (!open) setSaveError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={createOrg}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization name</Label>
                <Input
                  id="orgName"
                  placeholder="Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowOrgDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create project dialog */}
      <Dialog open={showProjectDialog} onOpenChange={(open) => { setShowProjectDialog(open); if (!open) setSaveError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <form onSubmit={createProject}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project name</Label>
                <Input
                  id="projectName"
                  placeholder="Q4 Roadmap"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowProjectDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {confirmDelete?.type === 'org' ? 'organization' : 'project'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">"{confirmDelete?.name}"</span>?
            {confirmDelete?.type === 'org'
              ? ' This will permanently delete all projects, tasks, messages, and documents inside it.'
              : ' This will permanently delete all tasks, messages, and documents inside it.'}
          </p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
