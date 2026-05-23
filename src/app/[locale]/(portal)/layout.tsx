import { PortalShell } from '@/components/portal/PortalShell';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <PortalShell>{children}</PortalShell>
    </RequireAuth>
  );
}
