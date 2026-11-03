import { AmbianceProvider } from "@/components/Ambiance";

/** Wraps every /admin route with the ambiance context + page backdrop, so the
 *  background selector is available (and the dark "Minuit" mode applies) here too. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AmbianceProvider>{children}</AmbianceProvider>;
}
