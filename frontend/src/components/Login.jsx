import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // --- NEW: AUTO-LOGIN CHECK ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            const user = JSON.parse(userStr);
            // Redirect based on role immediately
            if (user.role === 'super_admin') {
                navigate('/super-admin');
            } else {
                navigate('/dashboard');
            }
        }
    }, [navigate]);
    // -----------------------------

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await api.post('/api/login', { email, password });

            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            toast.success(`Welcome back, ${res.data.user.name}!`);

            if (res.data.user.role === 'super_admin') {
                navigate('/super-admin');
            } else {
                navigate('/dashboard');
            }

        } catch (err) {
            console.error(err);
            toast.error('Invalid email or password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <div className="card shadow-sm border-0" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="card-body p-4">
                    <div className="text-center mb-4">
                        <h3 className="fw-bold text-primary">Prince RTO</h3>
                        <p className="text-muted">Sign in to your account</p>
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <label className="form-label fw-semibold">Email Address</label>
                            <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="mb-4">
                            <label className="form-label fw-semibold">Password</label>
                            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <button className="btn btn-primary w-100 py-2 fw-bold" disabled={isLoading}>
                            {isLoading ? "Signing in..." : "Login"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
