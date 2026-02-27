import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils/cn';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isHoveringBtn, setIsHoveringBtn] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Intentar Login
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                // 2. Si falla por invalidez, intentar Registrar Usuario
                if (signInError.message.includes('Invalid login credentials')) {
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password,
                    });

                    if (signUpError) throw signUpError;

                    if (signUpData.session) {
                        await syncSessionAndRedirect(signUpData.session);
                        return;
                    } else {
                        setError("Por favor revisa tu correo para confirmar tu registro.");
                        return;
                    }
                }
                throw signInError;
            }

            if (data.session) {
                await syncSessionAndRedirect(data.session);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const syncSessionAndRedirect = async (session: any) => {
        try {
            const res = await fetch('/api/auth/set-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ event: 'SIGNED_IN', session }),
            });

            if (!res.ok) throw new Error('Error al sincronizar sesión');

            // Animación de salida brutalista antes del redirect
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)';

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 500);

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[420px] mx-auto pt-10">

            {/* Tarjeta Glassmórfica principal */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="glass-panel p-10 md:p-12 rounded-[2.5rem] relative z-10 overflow-hidden group"
            >
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[#EB3333]/15 dark:bg-[#EB3333]/20 blur-[100px] rounded-full pointer-events-none transition-all duration-1000 group-hover:bg-[#EB3333]/20 dark:group-hover:bg-[#EB3333]/30 group-hover:scale-110 mix-blend-multiply dark:mix-blend-screen"></div>

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
                        className="w-16 h-16 rounded-3xl bg-white/50 dark:bg-[#EB3333]/10 border border-black/5 dark:border-[#EB3333]/20 flex justify-center items-center backdrop-blur-md mb-8 relative overflow-hidden shadow-sm"
                    >
                        <div className="absolute inset-[-2px] rounded-[34px] border border-[#EB3333]/20 dark:border-white/10 animate-[spin_3s_linear_infinite]"></div>

                        {/* Logo Inteligente (Claro en Oscuro, Rojo en Claro) */}
                        <img src="/logos/Logo rojo (solo icono).svg" alt="Saca Logo" className="w-8 h-8 relative z-10 dark:hidden block opacity-90 transition-transform duration-500 scale-105" />
                        <img src="/logos/Logo blanco (solo icono).svg" alt="Saca Logo" className="w-8 h-8 relative z-10 hidden dark:block transition-transform duration-500 scale-105" />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
                        className="text-4xl font-display font-semibold text-zinc-900 dark:text-white tracking-tight leading-tight mb-2 transition-colors"
                    >
                        Entrar a la <br />Plataforma.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
                        className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-10 transition-colors"
                    >
                        Si tu cuenta no existe, la crearemos al vuelo.
                    </motion.p>

                    <form onSubmit={handleAuth} className="space-y-6">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}>
                            <label className="sr-only">Correo electrónico</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/50 dark:bg-[#0a0a0c]/60 border border-zinc-200 dark:border-white/5 py-4 px-5 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-[#EB3333]/20 focus:border-[#EB3333]/50 transition-all font-medium backdrop-blur-sm"
                                placeholder="usuario@saca.network"
                            />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }}>
                            <label className="sr-only">Contraseña</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/50 dark:bg-[#0a0a0c]/60 border border-zinc-200 dark:border-white/5 py-4 px-5 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-[#EB3333]/20 focus:border-[#EB3333]/50 transition-all font-medium backdrop-blur-sm"
                                placeholder="••••••••"
                            />
                        </motion.div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                    className="overflow-hidden"
                                >
                                    <p className="text-red-400 text-sm text-center bg-red-500/5 py-2 px-4 rounded-xl border border-red-500/10 backdrop-blur-sm">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            type="submit"
                            disabled={loading}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }}
                            onMouseEnter={() => setIsHoveringBtn(true)}
                            onMouseLeave={() => setIsHoveringBtn(false)}
                            className="w-full bg-white text-black hover:bg-zinc-200 py-4 px-6 rounded-2xl font-semibold tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98] relative overflow-hidden group/btn"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] animate-[shimmer_2s_infinite] group-hover/btn:translate-x-[150%] transition-transform duration-700"></div>

                            <span className="relative z-10">{loading ? 'Autenticando...' : 'Acceder al Dashboard'}</span>

                            {!loading && (
                                <ArrowRight
                                    className={cn(
                                        "w-5 h-5 relative z-10 transition-transform duration-500",
                                        isHoveringBtn ? "translate-x-1" : ""
                                    )}
                                />
                            )}
                            {loading && <Loader2 className="w-5 h-5 animate-spin relative z-10" />}
                        </motion.button>
                    </form>
                </div>
            </motion.div>

            {/* Decoración Externa Flotante */}
            <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}
                className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em] mt-8"
            >
                Secured by Saca Network
            </motion.p>
        </div>
    );
}
