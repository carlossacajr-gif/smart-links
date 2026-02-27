import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Plus, Activity, Youtube, Trash2, ExternalLink, Loader2, Link as LinkIcon, BarChart3 } from 'lucide-react';

export default function DashboardApp({ initialLinks }: { initialLinks: any[] }) {
    const [links, setLinks] = useState(initialLinks);
    const [url, setUrl] = useState('');
    const [alias, setAlias] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentDomain = typeof window !== 'undefined' ? window.location.origin : '';

    const generateAlias = () => {
        return Math.random().toString(36).substring(2, 8);
    };

    const createLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
                throw new Error('Solo se permiten enlaces de YouTube');
            }

            const finalAlias = alias.trim() || generateAlias();

            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, alias: finalAlias })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al generar enlace');
            }

            setLinks([data.data, ...links]);
            setUrl('');
            setAlias('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Podríamos añadir un toast aquí para feedback visual "Brutalist"
    };

    const deleteLink = async (id: string) => {
        if (!confirm('¿Eliminar este enlace?')) return;

        // Optimistic UI
        setLinks(links.filter(l => l.id !== id));

        await fetch(`/api/links?id=${id}`, {
            method: 'DELETE'
        });
    };

    return (
        <div className="w-full flex flex-col lg:flex-row gap-8 items-start">

            {/* Generator Column */}
            <div className="w-full lg:w-1/3 bg-[#121214]/60 backdrop-blur-xl border border-[#27272A] rounded-2xl p-6 shadow-2xl sticky top-8">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-400" /> Nuevo Enlace
                </h2>

                <form onSubmit={createLink} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Original YouTube URL</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Youtube className="h-5 w-5 text-zinc-500" />
                            </div>
                            <input
                                type="url"
                                required
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 bg-[#09090B] border border-[#27272A] rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                                placeholder="https://youtu.be/..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                            Alias Personalizado <span className="text-zinc-600 font-normal normal-case">(Opcional)</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LinkIcon className="h-4 w-4 text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                value={alias}
                                onChange={(e) => setAlias(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))} // Solo alphanumeric y dash
                                className="block w-full pl-9 pr-3 py-3 bg-[#09090B] border border-[#27272A] rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                                placeholder="mi-super-video"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-xs text-red-400 mt-0">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generar Smart Link"}
                    </button>
                </form>
            </div>

            {/* Links List Column */}
            <div className="w-full lg:w-2/3 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-400" /> Tus Enlaces
                    </h2>
                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md">{links.length} totales</span>
                </div>

                {links.length === 0 ? (
                    <div className="p-12 border border-dashed border-[#27272A] rounded-2xl flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 text-zinc-600">
                            <LinkIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-zinc-300 font-medium mb-1">Ningún enlace todavía</h3>
                        <p className="text-zinc-500 text-sm max-w-sm">Genera tu primer Smart Link introduciendo una URL de YouTube en el panel izquierdo.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {links.map((link) => {
                            const shortUrl = `${currentDomain}/${link.alias}`;
                            const clickCount = link.clicks && link.clicks[0] ? link.clicks[0].count : 0;

                            return (
                                <div key={link.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#121214] border border-[#27272A] hover:border-indigo-500/30 rounded-2xl transition-all shadow-sm">

                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <a href={shortUrl} target="_blank" className="text-indigo-400 hover:text-indigo-300 font-mono text-[15px] truncate max-w-full font-medium flex items-center gap-1.5 transition-colors">
                                                /{link.alias}
                                                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        </div>
                                        <p className="text-zinc-500 text-xs truncate max-w-full font-mono flex items-center gap-1.5">
                                            <Youtube className="w-3 h-3 text-red-500/80" /> {link.original_url}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-[#27272A]">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800" title="Total Clicks">
                                            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-xs font-mono text-zinc-300">{clickCount}</span>
                                        </div>

                                        <div className="w-px h-6 bg-[#27272A]"></div>

                                        <button
                                            onClick={() => copyToClipboard(shortUrl)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                            title="Copiar link"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteLink(link.id)}
                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Eliminar link"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
