import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const accessToken = cookies.get("sb-access-token");
        const refreshToken = cookies.get("sb-refresh-token");

        if (!accessToken || !refreshToken) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken.value);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { url, alias } = await request.json();

        if (!url || !url.includes("youtu")) {
            return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), { status: 400 });
        }

        // Insertar en Supabase. El ID y el created_at se generan solos por PG.
        const { data, error } = await supabase
            .from("links")
            .insert([
                {
                    original_url: url,
                    alias: alias.toLowerCase(),
                    user_id: user.id
                }
            ])
            .select()
            .single();

        if (error) {
            // Code 23505 es unique_violation en Postgres
            if (error.code === '23505') {
                return new Response(JSON.stringify({ error: "El alias ya existe. Elige otro." }), { status: 400 });
            }
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        // Inyectar clicks array temporal para que la UI mapee bien de inmediato el nuevo registro 
        // sin tener que refetch.
        const responseData = { ...data, clicks: [{ count: 0 }] };

        return new Response(JSON.stringify({ success: true, data: responseData }), { status: 200 });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};


export const DELETE: APIRoute = async ({ request, cookies }) => {
    try {
        const accessToken = cookies.get("sb-access-token");
        if (!accessToken) return new Response("Unauthorized", { status: 401 });

        const { data: { user } } = await supabase.auth.getUser(accessToken.value);
        if (!user) return new Response("Unauthorized", { status: 401 });

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) return new Response("ID requerido", { status: 400 });

        const { error } = await supabase
            .from("links")
            .delete()
            .match({ id: id, user_id: user.id });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
