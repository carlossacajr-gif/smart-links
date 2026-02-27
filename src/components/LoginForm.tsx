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
                {/* Spot de luz interactivo de fondo que sigue un poco el hover general */}
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none transition-all duration-1000 group-hover:bg-indigo-500/30 group-hover:scale-110"></div>

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
                        className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-center items-center backdrop-blur-md mb-8 relative overflow-hidden"
                    >
                        <div className="absolute inset-[-2px] rounded-[34px] border border-white/10 animate-[spin_3s_linear_infinite]"></div>
                        <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)]"></div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
                        className="text-4xl font-display font-semibold text-white tracking-tight leading-tight mb-2"
                    >
                        Entrar a la <br />Plataforma.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
                        className="text-zinc-400 text-sm font-medium mb-10"
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
                                className="w-full bg-[#0a0a0c]/60 border border-white/5 py-4 px-5 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium backdrop-blur-sm"
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
                                className="w-full bg-[#0a0a0c]/60 border border-white/5 py-4 px-5 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium backdrop-blur-sm"
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
