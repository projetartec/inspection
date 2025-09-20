// This is the root page, but the main content is in the (app) group at src/app/(app)/page.tsx
// This file can be empty or redirect, but for clarity, we just let the layout render the child.
// We are letting the routing system handle the resolution of the main page.
// Next.js will correctly render src/app/(app)/page.tsx when '/' is requested.
export default function RootPage() {
  return null;
}
