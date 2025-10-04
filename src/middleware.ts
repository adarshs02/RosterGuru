import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Recommended by Clerk: skip all static files (anything with a dot) and _next assets
    '/((?!.*\\..*|_next).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
