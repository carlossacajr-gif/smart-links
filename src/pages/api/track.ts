import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

export const POST: APIRoute = async ({ request }) => {
    try {
        const { linkId, userAgent, os, referer } = await request.json();

        if (!linkId) return new Response("Missing Link ID", { status: 400 });

        // Inserción asincrónica y ciega de analytics. No esperamos confirmación dura 
        // para no bloquear el Event Loop del cliente.
        const { error } = await supabase
            .from("clicks")
            .insert([
                {
                    link_id: linkId,
                    user_agent: userAgent,
                    os: os,
                    referer: referer || "Direct"
                }
            ]);

        if (error) {
            console.error("Analytics insert error:", error);
            return new Response("Error recording analytics", { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        console.error("Analytics parsing error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
