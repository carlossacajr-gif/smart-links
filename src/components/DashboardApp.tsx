import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Plus, Activity, Youtube, Trash2, ExternalLink, Loader2, Link as LinkIcon, BarChart3, Check, QrCode, Download, X, MousePointerClick, Clock, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils/cn';
import QRCode from "react-qr-code";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Toaster, toast } from 'sonner';

// Utility functions for UI
const getDomainInfo = (url: string) => {
    try {
        const u = new URL(url);
        const host = u.hostname.replace('www.', '');
        if (host.includes('youtube.com') || host.includes('youtu.be')) return { name: 'YouTube', icon: Youtube, color: 'text-[#EB3333]', bg: 'bg-[#EB3333]/10' };
        if (host.includes('twitter.com') || host.includes('x.com') || host.includes('t.co')) return { name: 'X/Twitter', icon: LinkIcon, color: 'text-zinc-900', bg: 'bg-zinc-100' };
        if (host.includes('amazon.')) return { name: 'Amazon', icon: LinkIcon, color: 'text-slate-700', bg: 'bg-slate-100' };
        if (host.includes('instagram.com')) return { name: 'Instagram', icon: LinkIcon, color: 'text-pink-600', bg: 'bg-pink-50' };
        return { name: host, icon: LinkIcon, color: 'text-zinc-500', bg: 'bg-zinc-100' };
    } catch {
        return { name: 'Enlace', icon: LinkIcon, color: 'text-zinc-500', bg: 'bg-zinc-100' };
    }
};

const getThumbnail = (link: any) => {
    if (link.custom_image) return link.custom_image;
    try {
        const u = new URL(link.original_url);
        if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
            const match = link.original_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
            if (match && match[1]) return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
        }
    } catch { }
    return null;
};

export default function DashboardApp({ initialLinks }: { initialLinks: any[] }) {
    const [links, setLinks] = useState(initialLinks);
    const [url, setUrl] = useState('');
    const [alias, setAlias] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const theme = 'light';
    const [activeQrId, setActiveQrId] = useState<string | null>(null);
    const [activeChartId, setActiveChartId] = useState<string | null>(null);
    const [chartData, setChartData] = useState<any>(null);
    const [loadingChartId, setLoadingChartId] = useState<string | null>(null);

    // Modal y Selección
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedLinks, setSelectedLinks] = useState<string[]>([]);

    // Meta-datos personalizados
    const [customTitle, setCustomTitle] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [customImage, setCustomImage] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Progressive Disclosure: Load More
    const LINKS_PER_PAGE = 6;
    const [visibleCount, setVisibleCount] = useState(LINKS_PER_PAGE);

    const currentDomain = typeof window !== 'undefined' ? window.location.origin : '';

    // Folders state
    const [customFolder, setCustomFolder] = useState('');
    const [activeFolder, setActiveFolder] = useState('Todas');
    const folders = ['Todas', ...Array.from(new Set(links.map((l: any) => l.folder).filter(Boolean)))];

    const filteredLinks = activeFolder === 'Todas' ? links : links.filter((l: any) => l.folder === activeFolder);

    // Computed KPI Stats
    const totalClicks = links.reduce((sum: number, l: any) => sum + (l.clicks?.[0]?.count || 0), 0);
    const topPerformer = links.length > 0
        ? links.reduce((top: any, l: any) => (l.clicks?.[0]?.count || 0) > (top.clicks?.[0]?.count || 0) ? l : top, links[0])
        : null;
    const recentLink = links.length > 0 ? links[0] : null;

    // Truncation utility (Design Principle #4)
    const truncateUrl = (url: string, max: number = 50) => url.length <= max ? url : url.slice(0, max) + '…';

    const generateAlias = () => {
        return Math.random().toString(36).substring(2, 8);
    };

    const createLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!url.startsWith('http')) {
                throw new Error('La URL debe comenzar con http o https');
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
                    custom_image: customImage.trim() || null,
                    folder: customFolder.trim() || null
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
            toast.success('¡Enlace potentísimo creado!');
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Enlace copiado al portapapeles");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const deleteLink = async (id: string) => {
        // Optimistic UI: Ocultamos el enlace instantáneamente
        const previousLinks = [...links];
        setLinks(links.filter(l => l.id !== id));

        try {
            const res = await fetch(`/api/links?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Error al eliminar");
            toast.success("Enlace eliminado permanente");
        } catch (err) {
            // Si falla en el servidor, revertimos la UI
            setLinks(previousLinks);
            toast.error("Falló la eliminación. El enlace ha regresado.");
        }
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

        setActiveQrId(null);
        setLoadingChartId(linkId);
        try {
            const res = await fetch(`/api/analytics?link_id=${linkId}`);
            const data = await res.json();
            if (res.ok && data.data) {
                setChartData(data.data);
                // Expand the chart ONLY after data is ready, preventing the layout shift jump
                setActiveChartId(linkId);
            } else {
                setChartData(null);
            }
        } catch (e) {
            console.error(e);
            setChartData(null);
        } finally {
            setLoadingChartId(null);
        }
    };

    const handleSelectLink = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedLinks([...selectedLinks, id]);
        } else {
            setSelectedLinks(selectedLinks.filter(l => l !== id));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedLinks(links.map(l => l.id));
        } else {
            setSelectedLinks([]);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto items-start relative z-10 pb-20 pt-8">
            <Toaster position="bottom-right" richColors theme="light" className="font-display" />

            {/* Dashboard Topbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-8 border-b border-zinc-200/60 gap-4">
                <div>
                    <h2 className="text-3xl font-display font-semibold text-zinc-900 tracking-tight flex items-center gap-3">
                        Smart Links
                    </h2>
                    <p className="text-[15px] text-zinc-500 mt-2 leading-relaxed">
                        Potencia cada clic. Centraliza tus enlaces y mide el impacto de tu contenido.
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm shadow-sm">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span className="text-zinc-700 font-medium">{links.length} enlaces</span>
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#EB3333] hover:bg-[#D12B2B] text-white text-[14px] font-bold tracking-wide rounded-full transition-all active:scale-[0.97] shadow-md shadow-[#EB3333]/20"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Link
                    </button>
                </div>
            </div>

            {/* Bento Grid KPI Cards */}
            {links.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-[#EB3333]/10 flex items-center justify-center">
                                <LinkIcon className="w-4 h-4 text-[#EB3333]" />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Enlaces</span>
                        </div>
                        <div className="text-2xl font-bold text-zinc-900 tracking-tight">{links.length}</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <MousePointerClick className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Clics</span>
                        </div>
                        <div className="text-2xl font-bold text-zinc-900 tracking-tight">{totalClicks}</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-amber-500" />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Top</span>
                        </div>
                        <div className="text-sm font-bold text-zinc-900 truncate font-mono">{topPerformer ? `/${topPerformer.alias}` : '—'}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{topPerformer ? `${topPerformer.clicks?.[0]?.count || 0} clics` : ''}</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Último</span>
                        </div>
                        <div className="text-sm font-bold text-zinc-900 truncate font-mono">{recentLink ? `/${recentLink.alias}` : '—'}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                            {recentLink ? new Date(recentLink.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : ''}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions Contextual Bar */}
            <AnimatePresence>
                {selectedLinks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-between bg-zinc-900 text-white rounded-2xl px-6 py-4 mb-6 shadow-xl"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 bg-white/20 rounded-full text-xs font-bold">{selectedLinks.length}</span>
                            <span className="text-sm font-medium">seleccionados</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    const text = links.filter(l => selectedLinks.includes(l.id)).map(l => `${currentDomain}/${l.alias}`).join('\n');
                                    copyToClipboard(text, 'bulk');
                                }}
                                className="text-sm font-medium hover:text-white/80 transition-colors"
                            >
                                Copiar todos
                            </button>
                            <div className="w-px h-4 bg-white/20"></div>
                            <button
                                onClick={async () => {
                                    const previousLinks = [...links];
                                    setLinks(links.filter(l => !selectedLinks.includes(l.id)));
                                    toast.success(`${selectedLinks.length} enlaces eliminados`);
                                    try {
                                        for (const id of selectedLinks) {
                                            await fetch(`/api/links?id=${id}`, { method: 'DELETE' });
                                        }
                                    } catch (err) {
                                        setLinks(previousLinks);
                                        toast.error("Error al eliminar los enlaces.");
                                    } finally {
                                        setSelectedLinks([]);
                                    }
                                }}
                                className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Creación */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsCreateModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-[460px] max-h-[90vh] overflow-y-auto scrollbar-none bg-white border border-zinc-200 shadow-2xl rounded-[2rem] p-8 sm:p-10 z-10"
                        >
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="mb-8 pr-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/5 border border-zinc-900/10 mb-4">
                                    <Plus className="w-3 h-3 text-zinc-900" />
                                    <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">Nuevo Smart Link</span>
                                </div>
                                <h2 className="text-2xl font-display font-semibold transition-colors text-zinc-900 tracking-tight">Crear Enlace</h2>
                            </div>

                            <form onSubmit={(e) => {
                                createLink(e).then(() => {
                                    if (!error) setIsCreateModalOpen(false);
                                });
                            }} className="space-y-6">
                                <div className="group">
                                    <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-500 mb-2 transition-colors group-focus-within:text-zinc-900 uppercase">
                                        URL de Destino
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <LinkIcon className="h-5 w-5 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                                        </div>
                                        <input
                                            type="url"
                                            required
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="block w-full pl-[3.25rem] pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-[1rem] text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900/50 focus:ring-4 focus:ring-zinc-900/5 transition-all font-medium"
                                            placeholder="https://ejemplo.com/recurso"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-[10px] font-bold tracking-[0.15em] text-zinc-500 mb-2 transition-colors group-focus-within:text-[#EB3333]">
                                        ALIAS <span className="text-zinc-400 font-medium opacity-70 ml-1 tracking-normal">(Opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <LinkIcon className="h-4 w-4 text-zinc-400 group-focus-within:text-[#EB3333] transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={alias}
                                            onChange={(e) => setAlias(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                                            className="block w-full pl-[3.25rem] pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-[1rem] text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#EB3333]/50 focus:ring-4 focus:ring-[#EB3333]/10 transition-all font-mono tracking-wide"
                                            placeholder="mi-super-video"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5"
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
                                                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold tracking-[0.1em] text-zinc-500 mb-2 uppercase">Título Público</label>
                                                        <input
                                                            type="text"
                                                            value={customTitle}
                                                            onChange={(e) => setCustomTitle(e.target.value)}
                                                            className="block w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#EB3333]/50 focus:ring-2 focus:ring-[#EB3333]/10 transition-all"
                                                            placeholder="Ej: Nuevo Video Oficial..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold tracking-[0.1em] text-zinc-500 mb-2 uppercase">Descripción</label>
                                                        <input
                                                            type="text"
                                                            value={customDescription}
                                                            onChange={(e) => setCustomDescription(e.target.value)}
                                                            className="block w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#EB3333]/50 focus:ring-2 focus:ring-[#EB3333]/10 transition-all"
                                                            placeholder="Breve sumario persuasivo"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold tracking-[0.1em] text-zinc-500 mb-2 uppercase">Carpeta (Grouping)</label>
                                                        <input
                                                            type="text"
                                                            value={customFolder}
                                                            onChange={(e) => setCustomFolder(e.target.value)}
                                                            className="block w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#EB3333]/50 focus:ring-2 focus:ring-[#EB3333]/10 transition-all font-medium"
                                                            placeholder="Ej: YouTube Shorts, Instagram Bio..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold tracking-[0.1em] text-zinc-500 mb-2 uppercase">Thumbnail (URL opcional)</label>
                                                        <input
                                                            type="url"
                                                            value={customImage}
                                                            onChange={(e) => setCustomImage(e.target.value)}
                                                            className="block w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#EB3333]/50 focus:ring-2 focus:ring-[#EB3333]/10 transition-all"
                                                            placeholder="https://tu-sitio.com/imagen.jpg"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex items-center justify-center py-[1.125rem] px-8 bg-[#EB3333] hover:bg-[#D12B2B] text-white text-[15px] font-bold tracking-wide rounded-[1.25rem] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden active:scale-[0.98] mt-4"
                                >
                                    {/* Brillo sobre el botón */}
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] animate-[shimmer_2s_infinite] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />

                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generar y Acortar"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Main Links Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="w-full space-y-4"
            >

                {/* Permanent Folders Navigation Global */}
                <div className="w-full mb-6">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none px-2 sm:px-0">
                        {folders.map(folder => (
                            <button
                                key={folder}
                                onClick={() => setActiveFolder(folder)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex-shrink-0 active:scale-95 border",
                                    activeFolder === folder
                                        ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                                )}
                            >
                                {folder}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredLinks.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="p-16 bg-white border border-zinc-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm"
                    >
                        <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mb-6 text-zinc-400 border border-zinc-100">
                            <LinkIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-display font-semibold text-zinc-900 mb-2 tracking-tight">El Motor está Listo</h3>
                        <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed mb-6">Genera tu primer Smart Link para iniciar la captura de tráfico y acelerar tu Speed-to-Lead.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-black text-white text-[14px] font-bold tracking-wide rounded-full transition-all active:scale-95 shadow-md"
                        >
                            <Plus className="w-4 h-4" />
                            Crear mi primer Link
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {/* Header Inteligente: "Tus enlaces" o "Seleccionar Todos" */}
                        {filteredLinks.length > 0 && (
                            <div className="flex flex-col gap-4 px-2 mb-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-display font-semibold text-zinc-900 tracking-tight">Tus enlaces</h3>

                                    {selectedLinks.length > 0 && (
                                        <div className="flex items-center animate-in fade-in zoom-in duration-300">
                                            <input
                                                type="checkbox"
                                                checked={selectedLinks.length === filteredLinks.length}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="w-4 h-4 rounded border-zinc-300 text-[#EB3333] focus:ring-[#EB3333] cursor-pointer"
                                                id="select-all-top"
                                            />
                                            <label htmlFor="select-all-top" className="ml-2 text-sm font-semibold text-zinc-600 cursor-pointer">Seleccionar {filteredLinks.length}</label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <AnimatePresence mode="popLayout">
                            {filteredLinks.slice(0, visibleCount).map((link: any) => {
                                const shortUrl = `${currentDomain}/${link.alias}`;
                                const clickCount = link.clicks && link.clicks[0] ? link.clicks[0].count : 0;
                                const isCopied = copiedId === link.id;

                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                        key={link.id}
                                        className={cn(
                                            "group flex flex-col p-5 md:p-6 bg-white border rounded-2xl transition-all shadow-sm hover:shadow-md",
                                            selectedLinks.includes(link.id) ? "border-[#EB3333] ring-1 ring-[#EB3333]/20 bg-red-50/20" : "border-zinc-200 hover:border-zinc-300"
                                        )}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full h-full gap-6">
                                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                                {/* Checkbox Individual (Visible on hover or seleted) */}
                                                <div className={cn("pt-4 flex-shrink-0 transition-opacity duration-300", selectedLinks.includes(link.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLinks.includes(link.id)}
                                                        onChange={(e) => handleSelectLink(link.id, e.target.checked)}
                                                        className="w-4 h-4 rounded border-zinc-300 text-[#EB3333] focus:ring-[#EB3333] cursor-pointer"
                                                    />
                                                </div>

                                                {/* Thumbnail/Icon */}
                                                <div className="flex-shrink-0 w-28 sm:w-36 aspect-video bg-zinc-100 rounded-xl overflow-hidden border border-black/5 relative flex items-center justify-center shadow-inner">
                                                    {getThumbnail(link) ? (
                                                        <img src={getThumbnail(link)} alt="Thumbnail" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={cn("w-full h-full flex items-center justify-center", getDomainInfo(link.original_url).bg)}>
                                                            {(() => {
                                                                const DomainIcon = getDomainInfo(link.original_url).icon;
                                                                return <DomainIcon className={cn("w-6 h-6 opacity-50", getDomainInfo(link.original_url).color)} />;
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-1 min-w-0 pr-2 pt-1">
                                                    <div className="flex items-center gap-3">
                                                        <a
                                                            href={shortUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-zinc-900 hover:text-black font-display font-bold text-lg sm:text-xl truncate flex items-center gap-2 transition-colors relative"
                                                        >
                                                            {link.custom_title || link.alias}
                                                            <ExternalLink className="w-4 h-4 text-zinc-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                                        </a>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-sm text-[#EB3333] font-mono font-medium truncate mb-1">
                                                        <span className="text-zinc-400 font-sans text-xs">Alias:</span>
                                                        <span className="opacity-50">/</span>{link.alias}
                                                    </div>

                                                    <p className="text-zinc-500 text-xs sm:text-sm truncate font-medium flex items-center gap-1.5 bg-black/5 w-max max-w-full px-2.5 py-1 rounded-lg border border-black/5">
                                                        {(() => {
                                                            const info = getDomainInfo(link.original_url);
                                                            const DomainIcon = info.icon;
                                                            return <DomainIcon className={cn("w-3.5 h-3.5 flex-shrink-0", info.color)} />;
                                                        })()}
                                                        <span className="truncate">{truncateUrl(link.original_url)}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 mt-6 sm:mt-0 pt-6 sm:pt-0 border-t border-zinc-200 sm:border-t-0 sm:pl-6 justify-between sm:justify-end">

                                                {/* Metric Pill as a Button */}
                                                <button
                                                    onClick={() => toggleChart(link.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 active:scale-95 border",
                                                        activeChartId === link.id
                                                            ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                                                            : "bg-white/50 border-zinc-200 hover:border-emerald-500/30 shadow-inner"
                                                    )}
                                                    aria-label="Ver analítica"
                                                    title="Ver analítica de clics"
                                                >
                                                    {loadingChartId === link.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                                    ) : (
                                                        <Activity className={cn("w-4 h-4", activeChartId === link.id ? "text-emerald-500" : "text-emerald-500")} />
                                                    )}
                                                    <span className={cn("text-sm font-semibold", activeChartId === link.id ? "text-emerald-700" : "text-zinc-900")}>
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
                                                                ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                                                                : "bg-black/5 text-zinc-600 hover:bg-black/10 hover:text-zinc-900 border-black/5 hover:border-black/10"
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
                                                                : "bg-black/5 text-zinc-600 hover:bg-black/10 hover:text-zinc-900 border-black/5 hover:border-black/10"
                                                        )}
                                                        title="Código QR"
                                                    >
                                                        <QrCode className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => deleteLink(link.id)}
                                                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-black/5 text-zinc-600 hover:bg-red-500/10 hover:text-[#EB3333] border border-black/5 hover:border-red-500/20 transition-all duration-300 active:scale-95"
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
                                                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                                >
                                                    <div className="pt-8 pb-4 px-2 mt-6 border-t border-zinc-200 flex flex-col items-center gap-6 overflow-hidden">
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
                                                                <h4 className="text-[15px] font-bold text-zinc-900">Código Escaneable</h4>
                                                                <p className="text-sm text-zinc-500 mt-1 mb-4 leading-relaxed max-w-sm mx-auto">Coloca este QR en tus empaques, pantallas o videos. Al escanearlo, activará la redirección instantánea Saca.</p>
                                                            </div>
                                                            <button
                                                                onClick={() => downloadQR(link.id, link.alias)}
                                                                className="inline-flex items-center justify-center gap-2 py-2.5 px-6 w-full sm:w-auto bg-black hover:bg-zinc-800 text-white font-semibold rounded-xl text-[15px] transition-colors active:scale-95 mx-auto"
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
                                                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-8 mt-6 border-t border-zinc-200">
                                                        <div className="flex items-center justify-between mb-6 px-2">
                                                            <div>
                                                                <h4 className="text-[15px] font-bold text-zinc-900 flex items-center gap-2">
                                                                    <BarChart3 className="w-4 h-4 text-[#EB3333]" /> Rendimiento (7 días)
                                                                </h4>
                                                                <p className="text-sm text-zinc-500 mt-1">Evolución de clics diarios</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-2xl font-display font-semibold text-zinc-900">{clickCount}</div>
                                                                <div className="text-[11px] font-bold tracking-wider text-emerald-500 uppercase">Total</div>
                                                            </div>
                                                        </div>

                                                        <div className="w-full -ml-4">
                                                            {chartData && chartData.timeline && chartData.timeline.length > 0 ? (
                                                                <div className="flex flex-col gap-6 w-full ml-4">
                                                                    <div className="h-[200px] w-full -ml-4">
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <AreaChart data={chartData.timeline} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
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
                                                                                        backgroundColor: '#ffffff',
                                                                                        borderColor: 'rgba(0,0,0,0.1)',
                                                                                        borderRadius: '12px',
                                                                                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                                                                        color: '#000'
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
                                                                    </div>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 pb-2 pr-4">
                                                                        {/* Top Referers */}
                                                                        <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-5 shadow-sm">
                                                                            <h5 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><MousePointerClick className="w-3.5 h-3.5" /> Top Orígenes</h5>
                                                                            <div className="space-y-3">
                                                                                {chartData.referers.map((r: any) => (
                                                                                    <div key={r.name} className="flex items-center justify-between">
                                                                                        <span className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                                                                                            {(() => {
                                                                                                const info = getDomainInfo(`https://${r.name}`);
                                                                                                const Icon = info.icon;
                                                                                                return <Icon className={cn("w-4 h-4", info.color)} />;
                                                                                            })()}
                                                                                            {r.name}
                                                                                        </span>
                                                                                        <span className="text-sm font-bold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-sm">{r.count}</span>
                                                                                    </div>
                                                                                ))}
                                                                                {chartData.referers.length === 0 && <p className="text-xs text-zinc-400">Sin datos de origen</p>}
                                                                            </div>
                                                                        </div>

                                                                        {/* Top Devices */}
                                                                        <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-5 shadow-sm">
                                                                            <h5 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Dispositivos</h5>
                                                                            <div className="space-y-3">
                                                                                {chartData.devices.map((d: any) => (
                                                                                    <div key={d.name} className="flex items-center justify-between">
                                                                                        <span className="text-sm font-medium text-zinc-900">{d.name}</span>
                                                                                        <span className="text-sm font-bold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-sm">{d.count}</span>
                                                                                    </div>
                                                                                ))}
                                                                                {chartData.devices.length === 0 && <p className="text-xs text-zinc-400">Sin datos de dispositivo</p>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="w-full h-[200px] flex items-center justify-center">
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

                        {/* Progressive Disclosure: Load More (Design Principle #3) */}
                        {visibleCount < filteredLinks.length && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + LINKS_PER_PAGE)}
                                    className="flex items-center gap-2 px-8 py-3 border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 text-sm font-semibold rounded-full transition-all active:scale-[0.97] shadow-sm hover:shadow-md"
                                >
                                    Cargar {Math.min(LINKS_PER_PAGE, filteredLinks.length - visibleCount)} más de {filteredLinks.length - visibleCount}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
