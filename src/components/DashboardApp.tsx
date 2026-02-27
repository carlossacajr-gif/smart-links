import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Plus, Activity, Youtube, Trash2, ExternalLink, Loader2, Link as LinkIcon, BarChart3, Check, QrCode, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils/cn';
import QRCode from "react-qr-code";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Toaster, toast } from 'sonner';

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
    const [chartData, setChartData] = useState<any[]>([]);
    const [chartLoading, setChartLoading] = useState(false);

    // Modal y Selección
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedLinks, setSelectedLinks] = useState<string[]>([]);

    // Meta-datos personalizados
    const [customTitle, setCustomTitle] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [customImage, setCustomImage] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

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
                        Dashboard
                    </h2>
                    <p className="text-[15px] text-zinc-500 mt-2 leading-relaxed">
                        Gestiona tus Smart Links, monitorea tráfico y configura metadatos.
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm shadow-sm">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span className="text-zinc-700 font-medium">{links.length} enlaces</span>
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#EB3333] hover:bg-[#D12B2B] text-white text-[14px] font-bold tracking-wide rounded-full transition-all active:scale-95 shadow-md shadow-[#EB3333]/20"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Link
                    </button>
                </div>
            </div>

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
                            className="relative w-full max-w-[460px] bg-white border border-zinc-200 shadow-2xl rounded-[2rem] p-8 sm:p-10 z-10"
                        >
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="mb-8 pr-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EB3333]/10 border border-[#EB3333]/20 mb-4">
                                    <Plus className="w-3 h-3 text-[#EB3333]" />
                                    <span className="text-[10px] font-bold text-[#EB3333] uppercase tracking-widest">Nuevo Saca Link</span>
                                </div>
                                <h2 className="text-2xl font-display font-semibold transition-colors text-zinc-900 tracking-tight">Potenciar URL</h2>
                            </div>

                            <form onSubmit={(e) => {
                                createLink(e).then(() => {
                                    if (!error) setIsCreateModalOpen(false);
                                });
                            }} className="space-y-6">
                                <div className="group">
                                    <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-500 mb-2 transition-colors group-focus-within:text-[#EB3333] uppercase">
                                        Original YouTube URL
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Youtube className="h-5 w-5 text-zinc-400 group-focus-within:text-[#EB3333] transition-colors" />
                                        </div>
                                        <input
                                            type="url"
                                            required
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="block w-full pl-[3.25rem] pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-[1rem] text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#EB3333]/50 focus:ring-4 focus:ring-[#EB3333]/10 transition-all font-medium"
                                            placeholder="https://youtu.be/..."
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

                {links.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="p-16 bg-white border border-zinc-200 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm"
                    >
                        <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mb-6 text-zinc-400 border border-zinc-100">
                            <LinkIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-display font-semibold text-zinc-900 mb-2 tracking-tight">Lienzo vacío</h3>
                        <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed mb-6">Tu historial de Saca Links aparecerá aquí una vez que generes tu primer enlace.</p>
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
                        {/* Selected All Header */}
                        {links.length > 0 && (
                            <div className="flex items-center px-6 py-3 bg-white/50 border border-zinc-200 rounded-2xl mb-2 shadow-sm">
                                <input
                                    type="checkbox"
                                    checked={selectedLinks.length === links.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-300 text-[#EB3333] focus:ring-[#EB3333] cursor-pointer"
                                />
                                <span className="ml-4 text-sm font-semibold text-zinc-500">Seleccionar todos los {links.length} enlaces</span>
                            </div>
                        )}

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
                                        className={cn(
                                            "group flex flex-col p-5 md:p-6 bg-white border rounded-2xl transition-all shadow-sm hover:shadow-md",
                                            selectedLinks.includes(link.id) ? "border-[#EB3333] ring-1 ring-[#EB3333]/20 bg-red-50/20" : "border-zinc-200 hover:border-zinc-300"
                                        )}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full h-full gap-6">
                                            <div className="flex items-start gap-4 flex-1 overflow-hidden">
                                                {/* Checkbox Individual */}
                                                <div className="pt-1.5 flex-shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLinks.includes(link.id)}
                                                        onChange={(e) => handleSelectLink(link.id, e.target.checked)}
                                                        className="w-4 h-4 rounded border-zinc-300 text-[#EB3333] focus:ring-[#EB3333] cursor-pointer"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2 min-w-0 pr-6">
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
                                                    <p className="text-zinc-500 text-sm truncate font-medium flex items-center gap-2 bg-black/5 w-max max-w-full px-3 py-1.5 rounded-lg border border-black/5">
                                                        <Youtube className="w-4 h-4 text-[#EB3333]/90" /> {link.original_url}
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
                                                    <Activity className={cn("w-4 h-4", activeChartId === link.id ? "text-emerald-500" : "text-emerald-500")} />
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
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-8 mt-6 border-t border-zinc-200 flex flex-col items-center gap-6">
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

                                                        <div className="h-[200px] w-full -ml-4">
                                                            {chartLoading ? (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
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
