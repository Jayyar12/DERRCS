import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { DataTable } from '@/components/common/DataTable';

function StaffView({
  users,
  loading,
  form,
  setForm,
  onRefresh,
  onCreateUser,
  onToggleUser,
  creatingUser,
  updatingUserId,
}) {
  return (
    <>
      {/* Staff table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Staff Accounts</CardTitle>
            <CardDescription>Manage dispatchers, responders, and admins.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>Refresh</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-4 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : users.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyTitle>No staff accounts</EmptyTitle>
                <EmptyDescription>There are no staff accounts configured.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <DataTable>
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-border">
                      <TableCell>
                        <div className="font-semibold">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">{user.username}</div>
                      </TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'} className={user.is_active ? 'bg-success text-success-foreground hover:bg-success' : ''}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={user.id === localStorage.getItem('derrsc_user_id') || Boolean(updatingUserId)}
                          onClick={() => onToggleUser(user)}
                        >
                          {updatingUserId === user.id ? (
                            <><Spinner data-icon="inline-start" /> Updating…</>
                          ) : user.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTable>
          )}
        </CardContent>
      </Card>

      {/* Create staff form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Staff Account</CardTitle>
          <CardDescription>Add a new dispatcher, responder, or admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreateUser} className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="new-full-name">Full Name</FieldLabel>
                  <Input id="new-full-name" value={form.fullName} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-username">Username</FieldLabel>
                  <Input id="new-username" autoComplete="username" value={form.username} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-phone">Phone (Optional)</FieldLabel>
                  <Input id="new-phone" type="tel" autoComplete="tel" value={form.phoneNumber} onChange={(e) => setForm((c) => ({ ...c, phoneNumber: e.target.value }))} />
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="new-password">Temporary Password</FieldLabel>
                  <Input id="new-password" type="password" minLength="8" autoComplete="new-password" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-role">Role</FieldLabel>
                  <Select
                    value={form.role}
                    onValueChange={(role) => setForm((c) => ({ ...c, role }))}
                  >
                    <SelectTrigger id="new-role" className="w-full bg-background h-10 px-3 text-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {['Dispatcher', 'ResponseUnit', 'Admin'].map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>
            <Button type="submit" className="self-start" disabled={creatingUser}>
              {creatingUser ? <><Spinner data-icon="inline-start" /> Creating…</> : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

export default StaffView;
