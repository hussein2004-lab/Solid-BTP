import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed the "middleware" convention to "proxy". This detects the
// locale (Accept-Language for new visitors, NEXT_LOCALE cookie after a manual
// switch) and rewrites/redirects accordingly.
export default createMiddleware(routing);

export const config = {
  // Run on every path EXCEPT API routes, Next internals, and files with an
  // extension (images under /public, etc.). The landing `/` is included.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
