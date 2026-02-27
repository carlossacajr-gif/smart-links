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
            .select('created_at, referer, os, device_type, country, city')
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

        // Convert chart daily data to array
        const chartData = Object.keys(dailyCounts).map(date => ({
            date,
            clics: dailyCounts[date]
        }));

        // Group by Referer
        const refererCounts: Record<string, number> = {};
        // Group by OS
        const osCounts: Record<string, number> = {};
        // Group by Country
        const countryCounts: Record<string, number> = {};

        clicks?.forEach(click => {
            // Count Referers
            const ref = click.referer || 'Direct';
            // Simple clean up for common referers (e.g. android-app://com.google.android.youtube -> YouTube App)
            let cleanRef = ref;
            if (ref.includes('youtube.com') || ref.includes('android-app://com.google.android.youtube') || ref.includes('youtu.be')) cleanRef = 'YouTube';
            else if (ref.includes('t.co') || ref.includes('twitter.com')) cleanRef = 'X / Twitter';
            else if (ref.includes('instagram.com')) cleanRef = 'Instagram';
            else if (ref.includes('facebook.com') || ref.includes('fb.com') || ref.includes('fb://')) cleanRef = 'Facebook';
            else if (ref.includes('tiktok.com')) cleanRef = 'TikTok';
            else if (ref.includes('linkedin.com')) cleanRef = 'LinkedIn';
            else if (ref === 'Direct') cleanRef = 'Directo';
            else if (ref.startsWith('http')) {
                try {
                    const urlObj = new URL(ref);
                    cleanRef = urlObj.hostname.replace('www.', '');
                } catch (e) { }
            }

            refererCounts[cleanRef] = (refererCounts[cleanRef] || 0) + 1;

            // Count OS & Device Type
            const os = click.os || 'Otro';
            const deviceType = click.device_type ? ` (${click.device_type})` : '';
            const osKey = `${os}${deviceType}`;
            osCounts[osKey] = (osCounts[osKey] || 0) + 1;

            // Count Country
            const country = click.country || 'Desconocido';
            countryCounts[country] = (countryCounts[country] || 0) + 1;
        });

        const topReferers = Object.entries(refererCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // top 5

        const topDevices = Object.entries(osCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const topCountries = Object.entries(countryCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return new Response(JSON.stringify({
            data: {
                timeline: chartData,
                referers: topReferers,
                devices: topDevices,
                countries: topCountries
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
