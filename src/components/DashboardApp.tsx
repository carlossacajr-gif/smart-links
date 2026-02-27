import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Plus, Activity, Youtube, Trash2, ExternalLink, Loader2, Link as LinkIcon, BarChart3, Check, Moon, Sun, QrCode, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils/cn';
import QRCode from "react-qr-code";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

export default function DashboardApp({ initialLinks }: { initialLinks: any[] }) {
    const [links, setLinks] = useState(initialLinks);
    const [url, setUrl] = useState('');
    const [alias, setAlias] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [activeQrId, setActiveQrId] = useState<string | null>(null);
    const [activeChartId, setActiveChartId] = useState<string | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [chartLoading, setChartLoading] = useState(false);

    // Meta-datos personalizados
    const [customTitle, setCustomTitle] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [customImage, setCustomImage] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const currentDomain = typeof window !== 'undefined' ? window.location.origin : '';

    useEffect(() => {
        // Sincronizar estado inicial con el DOM que Astro procesó
        if (document.documentElement.classList.contains('dark')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

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
                body: JSON.stringify({
                    url,
                    alias: finalAlias,
                    custom_title: customTitle.trim() || null,
                    custom_description: customDescription.trim() || null,
                    custom_image: customImage.trim() || null
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al generar enlace');

            setLinks([data.data, ...links]);
            setUrl('');
            setAlias('');
            setCustomTitle('');
            setCustomDescription('');
            setCustomImage('');
            setShowAdvanced(false);
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
        if (!confirm('¿Estás seguro de eliminar este enlace de Saca?')) return;
        setLinks(links.filter(l => l.id !== id));
        await fetch(`/api/links?id=${id}`, { method: 'DELETE' });
    };

    const downloadQR = (linkId: string, alias: string) => {
        const svg = document.getElementById(`qr-${linkId}`);
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            if (ctx) {
                // Rellenar fondo blanco para el QR
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            }
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `saca-qr-${alias}.png`;
            downloadLink.href = `${pngFile}`;
            downloadLink.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    const toggleChart = async (linkId: string) => {
        if (activeChartId === linkId) {
            setActiveChartId(null);
            return;
        }

        setActiveChartId(linkId);
        setActiveQrId(null);
        setChartLoading(true);
        try {
            const res = await fetch(`/api/analytics?link_id=${linkId}`);
            const data = await res.json();
            if (res.ok && data.data) {
                setChartData(data.data);
            } else {
                setChartData([]);
            }
        } catch (e) {
            console.error(e);
            setChartData([]);
        } finally {
            setChartLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col xl:flex-row gap-8 lg:gap-12 items-start relative z-10 pb-20">

            {/* Columna Izquierda: Generador Flotante (Apple Material) */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full xl:w-[420px] flex-shrink-0 bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 shadow-2xl shadow-black/5 dark:shadow-black/50 rounded-[2rem] p-8 xl:p-10 sticky top-10"
            >
                {/* Toggle Theme Positioned Absolutamente en Móvil, Header en Desktop */}
                <button
                    onClick={toggleTheme}
                    className="absolute top-8 right-8 xl:hidden flex items-center justify-center w-10 h-10 rounded-full border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EB3333]/10 border border-[#EB3333]/20 mb-5">
                        <Plus className="w-4 h-4 text-[#EB3333]" />
                        <span className="text-[11px] font-bold text-[#EB3333] uppercase tracking-widest">Crear Saca Link</span>
                    </div>
                    <h2 className="text-3xl font-display font-semibold transition-colors text-zinc-900 dark:text-white tracking-tight">Potenciar URL</h2>
                    <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">Pega la URL del video e inyectaremos la mejor vía de redirección nativa en iOS y Android.</p>
                </div>

                <form onSubmit={createLink} className="space-y-7">
                    <div className="group">
                        <label className="block text-[11px] font-bold tracking-[0.14em] text-zinc-500 mb-3 transition-colors group-focus-within:text-[#EB3333] uppercase">
                            Original YouTube URL
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Youtube className="h-5 w-5 text-zinc-400 dark:text-zinc-500 group-focus-within:text-[#EB3333] transition-colors" />
                            </div>
                            <input
                                type="url"
                                required
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="block w-full pl-[3.25rem] pr-4 py-4 bg-white/50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-[1.25rem] text-[15px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#EB3333]/50 focus:ring-4 focus:ring-[#EB3333]/10 transition-all font-medium"
                                placeholder="https://youtu.be/..."
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-[11px] font-bold tracking-[0.15em] text-zinc-500 mb-3 transition-colors group-focus-within:text-[#EB3333]">
                            ALIAS PERSONALIZADO <span className="text-zinc-400 dark:text-zinc-600 font-medium opacity-70 ml-1 tracking-normal">(Opcional)</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <LinkIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-[#EB3333] transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={alias}
                                onChange={(e) => setAlias(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                                className="block w-full pl-[3.25rem] pr-4 py-4 bg-white/50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-[1.25rem] text-[15px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-[#EB3333]/50 focus:ring-4 focus:ring-[#EB3333]/10 transition-all font-mono tracking-wide"
                                placeholder="mi-super-video"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform duration-300", showAdvanced ? "rotate-90" : "")}><path d="m9 18 6-6-6-6" /></svg>
                            Metadatos Personalizados {showAdvanced ? "(Ocultar)" : "(Opcional)"}
                        </button>

                        <AnimatePresence>
                            {showAdvanced && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="overflow-hidden space-y-4"
                                >
                                    <div className="p-4 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-2xl space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold tracking-[0.1em] text-zinc-500 mb-2 uppercase">Título Público</label>
                                            <input
                                                type="text"
                                                value={customTitle}
                                                onChange={(e) => setCustomTitle(e.target.value)}
                                                className="block w-full px-3 py-2.5 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#EB3333]/50 focus:ring-2 focus:ring-[#EB3333]/10 transition-all"
                                                placeholder="Ej: Nuevo Video Oficial..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold tracking-[0.1em] text-zinc-500 mb-2 uppercase">Descripción</label>
                                            <input
                                                type="text"
                                                value={customDescription}
                                                onChange={(e) => setCustomDescription(e.target.value)}
                                                className="block w-full px-3 py-2.5 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#EB3333]/50 focus:ring-2 focus:ring-[#EB3333]/10 transition-all"
                                                placeholder="Breve sumario persuasivo"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold tracking-[0.1em] text-zinc-500 mb-2 uppercase">Thumbnail (URL opcional)</label>
                                            <input
                                                type="url"
                                                value={customImage}
                                                onChange={(e) => setCustomImage(e.target.value)}
                                                className="block w-full px-3 py-2.5 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#EB3333]/50 focus:ring-2 focus:ring-[#EB3333]/10 transition-all"
                                                placeholder="https://tu-sitio.com/imagen.jpg"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex items-center justify-center py-[1.125rem] px-8 bg-[#EB3333] hover:bg-[#D12B2B] text-white text-[15px] font-bold tracking-wide rounded-[1.25rem] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden active:scale-[0.98] mt-4"
                    >
                        {/* Brillo sobre el botón */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] animate-[shimmer_2s_infinite] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />

                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generar"}
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
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-display font-semibold transition-colors text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                            Tus enlaces
                        </h2>
                        <div className="flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full text-sm">
                            <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            <span className="text-zinc-700 dark:text-zinc-200 font-medium">{links.length} totales</span>
                        </div>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="hidden xl:flex items-center justify-center w-11 h-11 rounded-full border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-sm"
                        title="Cambiar Tema (Light/Dark)"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>

                {links.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="p-16 glass-panel rounded-3xl flex flex-col items-center justify-center text-center border-dashed border-zinc-300 dark:border-white/20"
                    >
                        <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-zinc-400 dark:text-zinc-500 backdrop-blur-md border border-black/5 dark:border-white/5">
                            <LinkIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-display font-semibold text-zinc-900 dark:text-white mb-2 tracking-tight">Lienzo vacío</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-sm mx-auto leading-relaxed">Tu historial de Saca Links aparecerá aquí una vez que generes tu primer enlace.</p>
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
                                        className="group flex flex-col p-6 md:p-8 bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 rounded-[2rem] transition-all duration-300 hover:shadow-xl hover:border-zinc-300 dark:hover:border-white/10"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                            <div className="flex-1 min-w-0 pr-6">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <a
                                                        href={shortUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[#EB3333] hover:text-[#D12B2B] font-mono text-lg truncate font-medium flex items-center gap-2 transition-colors relative"
                                                    >
                                                        <span className="text-[#EB3333]/50">/</span>{link.alias}
                                                        <ExternalLink className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                                    </a>
                                                </div>
                                                <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate font-medium flex items-center gap-2 bg-black/5 dark:bg-black/20 w-max max-w-full px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
                                                    <Youtube className="w-4 h-4 text-[#EB3333]/90" /> {link.original_url}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 mt-6 sm:mt-0 pt-6 sm:pt-0 border-t border-zinc-200 sm:border-t-0 dark:border-white/10 sm:pl-6 justify-between sm:justify-end">

                                                {/* Metric Pill as a Button */}
                                                <button
                                                    onClick={() => toggleChart(link.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 active:scale-95 border",
                                                        activeChartId === link.id
                                                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                            : "bg-white/50 dark:bg-black/40 border-zinc-200 dark:border-white/5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 shadow-inner"
                                                    )}
                                                    aria-label="Ver analítica"
                                                    title="Ver analítica de clics"
                                                >
                                                    <Activity className={cn("w-4 h-4", activeChartId === link.id ? "text-emerald-500 dark:text-emerald-400" : "text-emerald-500 dark:text-emerald-400/80")} />
                                                    <span className={cn("text-sm font-semibold", activeChartId === link.id ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-900 dark:text-zinc-200")}>
                                                        {clickCount} <span className="font-normal ml-1 opacity-70">clicks</span>
                                                    </span>
                                                    <BarChart3 className="w-3.5 h-3.5 ml-1 opacity-50 hidden sm:block" />
                                                </button>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => copyToClipboard(shortUrl, link.id)}
                                                        className={cn(
                                                            "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 active:scale-95 border",
                                                            isCopied
                                                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                                : "bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
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
                                                        onClick={() => {
                                                            setActiveQrId(activeQrId === link.id ? null : link.id);
                                                            setActiveChartId(null);
                                                        }}
                                                        className={cn(
                                                            "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 active:scale-95 border",
                                                            activeQrId === link.id
                                                                ? "bg-[#EB3333]/20 text-[#EB3333] border-[#EB3333]/30"
                                                                : "bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                                                        )}
                                                        title="Código QR"
                                                    >
                                                        <QrCode className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => deleteLink(link.id)}
                                                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-[#EB3333] dark:hover:text-red-400 border border-black/5 dark:border-white/5 hover:border-red-500/20 dark:hover:border-red-500/30 transition-all duration-300 active:scale-95"
                                                        title="Eliminar link"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {activeQrId === link.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-8 mt-6 border-t border-zinc-200 dark:border-white/10 flex flex-col items-center gap-6">
                                                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-black/5 flex-shrink-0">
                                                            <QRCode
                                                                id={`qr-${link.id}`}
                                                                value={shortUrl}
                                                                size={140}
                                                                level="H"
                                                                fgColor="#18181b"
                                                                bgColor="#ffffff"
                                                            />
                                                        </div>
                                                        <div className="flex-1 text-center space-y-4 w-full">
                                                            <div>
                                                                <h4 className="text-[15px] font-bold text-zinc-900 dark:text-white">Código Escaneable</h4>
                                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-4 leading-relaxed max-w-sm mx-auto">Coloca este QR en tus empaques, pantallas o videos. Al escanearlo, activará la redirección instantánea Saca.</p>
                                                            </div>
                                                            <button
                                                                onClick={() => downloadQR(link.id, link.alias)}
                                                                className="inline-flex items-center justify-center gap-2 py-2.5 px-6 w-full sm:w-auto bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold rounded-xl text-[15px] transition-colors active:scale-95 mx-auto"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                                Descargar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <AnimatePresence>
                                            {activeChartId === link.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-8 mt-6 border-t border-zinc-200 dark:border-white/10">
                                                        <div className="flex items-center justify-between mb-6 px-2">
                                                            <div>
                                                                <h4 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                                                    <BarChart3 className="w-4 h-4 text-[#EB3333]" /> Rendimiento (7 días)
                                                                </h4>
                                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Evolución de clics diarios</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-2xl font-display font-semibold text-zinc-900 dark:text-white">{clickCount}</div>
                                                                <div className="text-[11px] font-bold tracking-wider text-emerald-500 uppercase">Total</div>
                                                            </div>
                                                        </div>

                                                        <div className="h-[200px] w-full -ml-4">
                                                            {chartLoading ? (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-300 dark:text-zinc-600" />
                                                                </div>
                                                            ) : chartData.length > 0 ? (
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                                                        <defs>
                                                                            <linearGradient id="colorClics" x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="5%" stopColor="#EB3333" stopOpacity={0.4} />
                                                                                <stop offset="95%" stopColor="#EB3333" stopOpacity={0} />
                                                                            </linearGradient>
                                                                        </defs>
                                                                        <XAxis
                                                                            dataKey="date"
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                            tick={{ fontSize: 11, fill: '#71717a' }}
                                                                            dy={10}
                                                                        />
                                                                        <Tooltip
                                                                            contentStyle={{
                                                                                backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                                                                                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                                                borderRadius: '12px',
                                                                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                                                                color: theme === 'dark' ? '#fff' : '#000'
                                                                            }}
                                                                            itemStyle={{ color: '#EB3333', fontWeight: 'bold' }}
                                                                            labelStyle={{ color: '#71717a', marginBottom: '4px' }}
                                                                        />
                                                                        <Area
                                                                            type="monotone"
                                                                            dataKey="clics"
                                                                            stroke="#EB3333"
                                                                            strokeWidth={2}
                                                                            fillOpacity={1}
                                                                            fill="url(#colorClics)"
                                                                        />
                                                                    </AreaChart>
                                                                </ResponsiveContainer>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <p className="text-zinc-500 text-sm">Sin datos suficientes.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
