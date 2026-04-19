import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto:
     * - _next/static, _next/image, favicon.ico
     * - service worker (sw.js, workbox-*)
     * - manifest e iconos PWA
     * - extensiones de imagen comunes
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-.*|manifest.json|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
