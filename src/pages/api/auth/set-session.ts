import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const body = await request.json();
    const { event, session } = body;

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Setear cookies que el Middleware verificará
        cookies.set("sb-access-token", session.access_token, {
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 1 Semana
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: "lax",
        });

        cookies.set("sb-refresh-token", session.refresh_token, {
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: "lax",
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (event === "SIGNED_OUT") {
        cookies.delete("sb-access-token", { path: "/" });
        cookies.delete("sb-refresh-token", { path: "/" });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response("Invalid request", { status: 400 });
};
