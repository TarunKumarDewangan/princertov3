import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import UserNavbar from "./UserNavbar";

export default function UserDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total_citizens: 0, total_vehicles: 0, collected_today: 0, expiring_soon: 0
    });
    const user = JSON.parse(localStorage.getItem('user'));

    // Permission Check
    const isLevel1 = user?.role === 'level_1';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/api/user/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Error fetching stats", error);
            }
        };
        fetchStats();
    }, []);

    const StatCard = ({ icon, color, subColor, title, value, textColor }) => (
        <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3 d-flex flex-column flex-lg-row align-items-center justify-content-center text-center text-lg-start gap-3">
                    <div className={`rounded-circle d-flex align-items-center justify-content-center ${subColor}`} style={{ width: '45px', height: '45px', minWidth: '45px' }}>
                        <i className={`bi ${icon} fs-5 ${color}`}></i>
                    </div>
                    <div>
                        <h4 className={`mb-0 fw-bold ${textColor}`}>{value}</h4>
                        <small className="text-muted text-uppercase fw-bold" style={{fontSize: '10px'}}>{title}</small>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />
            <div className="container mt-4 pb-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold text-dark">Dashboard</h3>
                    <span className="text-muted">Welcome back, <span className="fw-bold text-dark">{user?.name}</span></span>
                </div>

                <div className="row g-3 mb-4">
                    <StatCard icon="bi-exclamation-triangle-fill" color="text-warning" subColor="bg-warning-subtle" textColor="text-warning" title="Expiring (15 Days)" value={stats.expiring_soon} />
                    <StatCard icon="bi-currency-rupee" color="text-success" subColor="bg-success-subtle" textColor="text-success" title="Collected Today" value={`₹${Number(stats.collected_today).toLocaleString()}`} />
                    <StatCard icon="bi-people-fill" color="text-primary" subColor="bg-primary-subtle" textColor="text-dark" title="Total Citizens" value={stats.total_citizens} />
                    <StatCard icon="bi-truck" color="text-secondary" subColor="bg-secondary-subtle" textColor="text-dark" title="Total Vehicles" value={stats.total_vehicles} />
                </div>

                <h5 className="text-muted mb-3">Quick Actions</h5>

                {/* UPDATED GRID: changed col-md-4 to col-md-6 col-lg-3 to fit 4 items */}
                <div className="row g-3">

                    {/* 1. Manage Citizens */}
                    <div className="col-12 col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm h-100 p-4 text-center">
                            <div className="mb-3"><i className="bi bi-people-fill fs-1 text-primary d-block"></i></div>
                            <h5 className="card-title fw-bold">Manage Citizens</h5>
                            <p className="card-text text-muted small mb-4">Add new customers or update details.</p>
                            <div className="d-grid gap-2 mt-auto">
                                <Link to="/create-citizen" className="btn btn-primary fw-bold">+ New Citizen</Link>
                                <Link to="/citizens" className="btn btn-outline-primary fw-bold">View All</Link>
                            </div>
                        </div>
                    </div>

                    {/* 2. Expiry Reports */}
                    <div className="col-12 col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm h-100 p-4 text-center">
                            <div className="mb-3"><i className="bi bi-exclamation-triangle-fill fs-1 text-success d-block"></i></div>
                            <h5 className="card-title fw-bold">Expiry Reports</h5>
                            <p className="card-text text-muted small mb-4">Track documents expiring soon.</p>
                            <Link to="/reports/expiry" className="btn btn-success w-100 mt-auto fw-bold">View Reports</Link>
                        </div>
                    </div>

                    {/* 3. NEW: Cash Flow */}
                    <div className="col-12 col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm h-100 p-4 text-center">
                            <div className="mb-3"><i className="bi bi-cash-coin fs-1 text-warning d-block"></i></div>
                            <h5 className="card-title fw-bold">Cash Flow</h5>
                            <p className="card-text text-muted small mb-4">Daily collections & payment ledger.</p>
                            <Link to="/cash-flow" className="btn btn-warning w-100 mt-auto fw-bold text-dark">View Ledger</Link>
                        </div>
                    </div>

                    {/* 4. Data Backup (Only for Level 1) */}
                    {isLevel1 && (
                        <div className="col-12 col-md-6 col-lg-3">
                            <div className="card border-0 shadow-sm h-100 p-4 text-center">
                                <div className="mb-3"><i className="bi bi-floppy-fill fs-1 text-secondary d-block"></i></div>
                                <h5 className="card-title fw-bold">Data Backup</h5>
                                <p className="card-text text-muted small mb-4">Download database backup.</p>
                                <Link to="/backup" className="btn btn-secondary w-100 mt-auto fw-bold">Go to Backup</Link>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
