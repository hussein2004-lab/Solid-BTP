import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation helpers. Use THESE (not next/navigation) for internal
 * links and programmatic navigation so the active locale prefix is preserved.
 * Hash links (`#contact`) can stay as plain <a>.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
