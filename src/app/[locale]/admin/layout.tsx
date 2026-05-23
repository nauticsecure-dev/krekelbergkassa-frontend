import { AdminShell } from '@/components/admin/AdminShell';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
