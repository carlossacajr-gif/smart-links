import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

export const GET: APIRoute = async ({ request, url }) => {
    try {
        const linkId = url.searchParams.get("link_id");
        if (!linkId) return new Response(JSON.stringify({ error: "Missing link_id" }), { status: 400 });

        // Retrieve the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

        // Get clicks for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: clicks, error } = await supabase
            .from('clicks')
            .select('created_at')
            .eq('link_id', linkId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by day
        const dailyCounts: Record<string, number> = {};

        // Initialize last 7 days with 0
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            dailyCounts[dateStr] = 0;
        }

        clicks?.forEach(click => {
            const d = new Date(click.created_at);
            const dateStr = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            if (dailyCounts[dateStr] !== undefined) {
                dailyCounts[dateStr]++;
            }
        });

        // Convert to array format for recharts
        const chartData = Object.keys(dailyCounts).map(date => ({
            date,
            clics: dailyCounts[date]
        }));

        return new Response(JSON.stringify({ data: chartData }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
