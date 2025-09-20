import { redirect } from 'next/navigation';

// This layout is now deprecated, redirecting to the root
export default function AppLayout() {
  redirect('/');
}
