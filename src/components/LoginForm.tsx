import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Command } from 'lucide-react';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Para el MVP y facilitar las pruebas, si la cuenta no existe la crearemos (SignUp implícito).
    // En un entorno de producción estricto, esto estaría separado.
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Intentamos hacer Sign In primero
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            if (signInError.message.includes('Invalid login credentials')) {
                // Si no existe, lo creamos
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (signUpError) {
                    setError(signUpError.message);
                    setLoading(false);
                    return;
                }

                if (signUpData.session) {
                    await syncSession(signUpData.session);
                }
            } else {
                setError(signInError.message);
                setLoading(false);
            }
        } else if (signInData.session) {
            await syncSession(signInData.session);
        }
    };

    const syncSession = async (session: any) => {
        try {
            await fetch('/api/auth/set-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'SIGNED_IN', session }),
            });
            window.location.href = '/dashboard';
        } catch (e) {
            setError('Error sincronizando sesión');
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm p-8 rounded-2xl bg-[#121214] border border-[#27272A] shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col items-center mb-8">
                <div className="h-12 w-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 mb-4">
                    <Command className="text-indigo-400 w-6 h-6" />
                </div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Access Platform</h1>
                <p className="text-sm text-zinc-400 mt-2 text-center">Inicia sesión o regístrate automáticamente para gestionar tus Smart Links.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                        placeholder="admin@saca.network"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1" htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400 text-center">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-all focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Access Dashboard"}
                </button>
            </form>
        </div>
    );
}
