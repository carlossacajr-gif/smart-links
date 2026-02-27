import { defineMiddleware } from "astro:middleware";
import type { MiddlewareHandler } from "astro";
import { supabase } from "./lib/supabase";

const protectedRoutes = ["/dashboard", "/api/links"];
const publicRoutes = ["/login", "/", "/favicon.ico", "/favicon.svg"];

export const onRequest: MiddlewareHandler = defineMiddleware(
    async ({ url, cookies, redirect }, next) => {
        // Si la ruta es pública o es un recurso estático, pasamos
        if (publicRoutes.includes(url.pathname) || !protectedRoutes.some(route => url.pathname.startsWith(route))) {
            return next();
        }

        const accessToken = cookies.get("sb-access-token");
        const refreshToken = cookies.get("sb-refresh-token");

        // Redirigir si no hay tokens y la ruta está protegida
        if (!accessToken || !refreshToken) {
            return redirect("/login");
        }

        // Setear la sesión en el cliente de SB para esta request SSR
        const { data, error } = await supabase.auth.setSession({
            refresh_token: refreshToken.value,
            access_token: accessToken.value,
        });

        if (error) {
            cookies.delete("sb-access-token", { path: "/" });
            cookies.delete("sb-refresh-token", { path: "/" });
            return redirect("/login");
        }

        // Pasamos
        return next();
    }
);
