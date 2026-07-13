import { RequireAuth } from '@/components/auth/RequireAuth';

// Trello #99: operational planning lives in its own protected route group so the
// staff/customer auth boundary is explicit (not mixed in with the public site).
// The URL stays /[locale]/planning — route groups in parentheses don't affect it.
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
