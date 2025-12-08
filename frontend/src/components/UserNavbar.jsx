import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api";

export default function UserNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));

    // Permissions
    const isLevel1 = user?.role === 'level_1';

    // Search States
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    const logout = () => {
        localStorage.clear();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path ? 'active fw-bold text-primary' : 'text-secondary';

    // ... (Search useEffect logic remains same) ...

    return (
        <nav className="navbar navbar-expand-lg bg-white shadow-sm sticky-top py-2">
            <div className="container-fluid px-4">
                <Link className="navbar-brand fw-bold text-primary fs-4" to="/dashboard">
                    <i className="bi bi-car-front-fill me-2"></i>Prince RTO
                </Link>

                <button className="navbar-toggler border-0" type="button" onClick={() => setIsOpen(!isOpen)}>
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className={`collapse navbar-collapse ${isOpen ? 'show' : ''} mt-2 mt-lg-0`}>

                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item"><Link className={`nav-link ${isActive('/dashboard')}`} to="/dashboard" onClick={()=>setIsOpen(false)}>Dashboard</Link></li>
                        <li className="nav-item"><Link className={`nav-link ${isActive('/citizens')}`} to="/citizens" onClick={()=>setIsOpen(false)}>Citizens</Link></li>
                        <li className="nav-item"><Link className={`nav-link ${isActive('/reports/expiry')}`} to="/reports/expiry" onClick={()=>setIsOpen(false)}>Expiry Reports</Link></li>

                        {/* --- NEW CASH FLOW MENU ITEM --- */}
                        <li className="nav-item"><Link className={`nav-link ${isActive('/cash-flow')}`} to="/cash-flow" onClick={()=>setIsOpen(false)}>Cash Flow</Link></li>
                       <li className="nav-item"><Link className={`nav-link ${isActive('/work-book')}`} to="/work-book" onClick={()=>setIsOpen(false)}>Work Book</Link></li>
                       <li className="nav-item">
    <Link className={`nav-link ${isActive('/settings')}`} to="/settings" onClick={()=>setIsOpen(false)}>Settings</Link>
</li>
                        {isLevel1 && (
                            <li className="nav-item"><Link className={`nav-link ${isActive('/backup')}`} to="/backup" onClick={()=>setIsOpen(false)}>Backup</Link></li>

                        )}
                        {isLevel1 && (
    <li className="nav-item">
        <Link className={`nav-link ${isActive('/bulk-import')}`} to="/bulk-import">Bulk Import</Link>
    </li>
)}
                    </ul>

                    {/* ... (Search bar & User Profile section remains same) ... */}
                    {/* Just copy the rest of your existing Search/Profile code here */}
                     <div className="d-flex align-items-center justify-content-between border-top pt-3 pt-lg-0 border-lg-0 mt-3 mt-lg-0">
                         <div className="d-flex align-items-center">
                            <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{width:'35px', height:'35px'}}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="lh-1 d-none d-lg-block">
                                <small className="text-muted d-block" style={{fontSize: '10px'}}>
                                    {isLevel1 ? 'Level 1 Admin' : 'Level 0 Staff'}
                                </small>
                                <span className="fw-bold text-dark small">{user?.name}</span>
                            </div>
                        </div>
                        <button onClick={logout} className="btn btn-outline-danger btn-sm ms-3">Logout</button>
                    </div>

                </div>
            </div>
        </nav>
    );
}
