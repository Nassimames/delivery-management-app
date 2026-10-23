import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

const protectedRoots = ["/", "/products", "/zones", "/orders"];

function isProtectedPath(pathname: string) {
  return protectedRoots.some(
    (root) => pathname === root || (root !== "/" && pathname.startsWith(`${root}/`)),
  );
}

function isAuthPath(pathname: string) {
  return pathname === "/login" || pathname === "/signup";
}

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";
  const redirectResponse = NextResponse.redirect(redirectUrl);

  response.cookies.getAll().forEach(({ name, value, ...options }) => {
    redirectResponse.cookies.set(name, value, options);
  });

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { key, url } = getSupabasePublicConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("Unable to refresh the Supabase session in proxy:", error);
  } else {
    const authenticated = Boolean(data?.claims);

    if (isProtectedPath(request.nextUrl.pathname) && !authenticated) {
      return redirectWithCookies(request, response, "/login");
    }

    if (isAuthPath(request.nextUrl.pathname) && authenticated) {
      return redirectWithCookies(request, response, "/");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/products/:path*",
    "/zones/:path*",
    "/orders/:path*",
    "/auth/callback",
  ],
};
