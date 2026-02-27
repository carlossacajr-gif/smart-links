import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Plus, Activity, Youtube, Trash2, ExternalLink, Loader2, Link as LinkIcon, BarChart3, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils/cn';

export default function DashboardApp({ initialLinks }: { initialLinks: any[] }) {
    const [links, setLinks] = useState(initialLinks);
    const [url, setUrl] = useState('');
    const [alias, setAlias] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

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
            if (!res.ok) throw new Error(data.error || 'Error al generar enlace');

            setLinks([data.data, ...links]);
            setUrl('');
            setAlias('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const deleteLink = async (id: string) => {
        // Animación de salida optimística inmediata (Framermotion hace el unmount)
        setLinks(links.filter(l => l.id !== id));
        await fetch(`/api/links?id=${id}`, { method: 'DELETE' });
    };

    return (
        <div className="w-full flex flex-col xl:flex-row gap-8 lg:gap-12 items-start relative z-10 pb-20">

            {/* Columna Izquierda: Generador Flotante (Glassmorphism 2026) */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full xl:w-[400px] flex-shrink-0 glass-panel rounded-3xl p-8 sticky top-10"
            >
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
                        <Plus className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">Crear Link</span>
                    </div>
                    <h2 className="text-2xl font-display font-semibold text-white tracking-tight">Nuevo Smart Link</h2>
                    <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Pega la URL del video e inyectaremos la mejor vía de redirección nativa en iOS y Android.</p>
                </div>

                <form onSubmit={createLink} className="space-y-6">
                    <div className="group">
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2.5 transition-colors group-focus-within:text-indigo-400">
                            Original YouTube URL
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Youtube className="h-5 w-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                            </div>
                            <input
                                type="url"
                                required
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="block w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                placeholder="https://youtu.be/..."
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2.5 transition-colors group-focus-within:text-indigo-400">
                            Alias Personalizado <span className="text-zinc-600 font-normal opacity-70 ml-1">(Opcional)</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <LinkIcon className="h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={alias}
                                onChange={(e) => setAlias(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                                className="block w-full pl-11 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-sm tracking-wide"
                                placeholder="mi-super-video"
                            />
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                                    <p className="text-sm text-red-400 font-medium">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex items-center justify-center py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-[0_4px_24px_rgba(99,102,241,0.4)] hover:shadow-[0_8px_32px_rgba(99,102,241,0.5)] active:scale-[0.98]"
                    >
                        {/* Brillo sobre el botón */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] animate-[shimmer_2s_infinite] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />

                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generar Smart Link"}
                    </button>
                </form>
            </motion.div>

            {/* Columna Derecha: Lista de Links (Anti-Grid / Fluid Cards) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full xl:flex-1"
            >
                <div className="flex items-center justify-between mb-8 pl-2">
                    <h2 className="text-2xl font-display font-semibold text-white tracking-tight flex items-center gap-3">
                        Tus Enlaces
                    </h2>
                    <div className="flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full text-sm">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-zinc-200 font-medium">{links.length} totales</span>
                    </div>
                </div>

                {links.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="p-16 glass-panel rounded-3xl flex flex-col items-center justify-center text-center border-dashed border-white/20"
                    >
                        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-zinc-500 backdrop-blur-md border border-white/5">
                            <LinkIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-display font-medium text-white mb-2">Lienzo vacío</h3>
                        <p className="text-zinc-400 max-w-sm mx-auto leading-relaxed">La lista de tus Smart Links aparecerá aquí una vez que generes tu primer enlace en el panel izquierdo.</p>
                    </motion.div>
                ) : (
                    <div className="grid gap-5">
                        <AnimatePresence mode="popLayout">
                            {links.map((link) => {
                                const shortUrl = `${currentDomain}/${link.alias}`;
                                const clickCount = link.clicks && link.clicks[0] ? link.clicks[0].count : 0;
                                const isCopied = copiedId === link.id;

                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        key={link.id}
                                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6 glass-panel rounded-3xl transition-all hover:border-indigo-500/40 hover:bg-white/[0.03] hover:shadow-[0_8px_32px_rgba(99,102,241,0.08)] bg-[#121214]/60"
                                    >

                                        <div className="flex-1 min-w-0 pr-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <a
                                                    href={shortUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-indigo-400 hover:text-indigo-300 font-mono text-lg truncate font-medium flex items-center gap-2 transition-colors relative"
                                                >
                                                    <span className="text-indigo-500/50">/</span>{link.alias}
                                                    <ExternalLink className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                                </a>
                                            </div>
                                            <p className="text-zinc-400 text-sm truncate font-medium flex items-center gap-2 bg-black/20 w-max max-w-full px-3 py-1.5 rounded-lg border border-white/5">
                                                <Youtube className="w-4 h-4 text-red-500/90" /> {link.original_url}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-t-0 border-white/10 sm:pl-6 justify-between sm:justify-end">

                                            {/* Metric Pill */}
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/5 shadow-inner" aria-label="Total Clicks">
                                                <Activity className="w-4 h-4 text-emerald-400/80" />
                                                <span className="text-sm font-semibold text-zinc-200">{clickCount} <span className="text-zinc-500 font-normal ml-1">clicks</span></span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => copyToClipboard(shortUrl, link.id)}
                                                    className={cn(
                                                        "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 active:scale-95 border",
                                                        isCopied
                                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                            : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border-white/5 hover:border-white/10"
                                                    )}
                                                    title="Copiar link"
                                                >
                                                    <AnimatePresence mode="wait">
                                                        <motion.div
                                                            key={isCopied ? 'check' : 'copy'}
                                                            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                                                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                                            exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                                                            transition={{ duration: 0.15 }}
                                                        >
                                                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                        </motion.div>
                                                    </AnimatePresence>
                                                </button>

                                                <button
                                                    onClick={() => deleteLink(link.id)}
                                                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all duration-300 active:scale-95"
                                                    title="Eliminar link"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
