import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

export const POST: APIRoute = async ({ request }) => {
    try {
        const { linkId, userAgent, referer } = await request.json();

        if (!linkId) return new Response("Missing Link ID", { status: 400 });

        // Extraer Geolocalización desde las cabeceras inyectadas por los edge workers de Cloudflare
        const country = request.headers.get('cf-ipcountry') || 'Desconocido';
        const city = request.headers.get('cf-ipcity') || 'Desconocido';

        // Parsear OS & Device rudimentario desde userAgent crudo
        const ua = (userAgent || "").toLowerCase();
        let parsedOs = "Otro";
        let deviceType = "Desktop";

        if (ua.includes("windows")) parsedOs = "Windows";
        else if (ua.includes("mac os") || ua.includes("macintosh")) parsedOs = "macOS";
        else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
            parsedOs = "iOS";
            deviceType = ua.includes("ipad") ? "Tablet" : "Mobile";
        }
        else if (ua.includes("android")) {
            parsedOs = "Android";
            deviceType = "Mobile";
        }
        else if (ua.includes("linux")) parsedOs = "Linux";

        // Inserción asincrónica y ciega de analytics en el tracking engine (Fase 8)
        const { error } = await supabase
            .from("clicks")
            .insert([
                {
                    link_id: linkId,
                    user_agent: userAgent,
                    os: parsedOs,
                    country: country,
                    city: city,
                    device_type: deviceType,
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
