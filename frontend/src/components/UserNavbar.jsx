import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function UserNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));

    // State for Mobile Menu Toggle
    const [isOpen, setIsOpen] = useState(false);

    const logout = () => {
        localStorage.clear();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path ? 'active fw-bold text-primary' : 'text-secondary';

    return (
        <nav className="navbar navbar-expand-lg bg-white shadow-sm sticky-top">
            <div className="container">
                {/* Brand */}
                <Link className="navbar-brand fw-bold text-primary fs-4" to="/dashboard">
                    <i className="bi bi-car-front-fill me-2"></i>RTO Hub
                </Link>

                {/* Mobile Toggle Button */}
                <button
                    className="navbar-toggler border-0 focus-ring focus-ring-light"
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Menu Links */}
                <div className={`collapse navbar-collapse ${isOpen ? 'show' : ''} mt-2 mt-lg-0`}>
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                            <Link className={`nav-link ${isActive('/dashboard')}`} to="/dashboard" onClick={()=>setIsOpen(false)}>Dashboard</Link>
                        </li>
                        <li className="nav-item">
                            <Link className={`nav-link ${isActive('/citizens')}`} to="/citizens" onClick={()=>setIsOpen(false)}>Citizens</Link>
                        </li>
                        <li className="nav-item">
                            <Link className={`nav-link ${isActive('/reports/expiry')}`} to="/reports/expiry" onClick={()=>setIsOpen(false)}>Expiry Reports</Link>
                        </li>
                        <li className="nav-item">
                            <Link className={`nav-link ${isActive('/backup')}`} to="/backup" onClick={()=>setIsOpen(false)}>Backup</Link>
                        </li>
                    </ul>

                    {/* User Profile & Logout */}
                    <div className="d-flex align-items-center justify-content-between border-top pt-3 pt-lg-0 border-lg-0 mt-3 mt-lg-0">
                         <div className="d-flex align-items-center">
                            <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{width:'35px', height:'35px'}}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="lh-1">
                                <small className="text-muted d-block" style={{fontSize: '10px'}}>Signed in as</small>
                                <span className="fw-bold text-dark small">{user?.name}</span>
                            </div>
                        </div>
                        <button onClick={logout} className="btn btn-outline-danger btn-sm ms-3">
                            <i className="bi bi-box-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
