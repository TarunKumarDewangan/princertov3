import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api";

export default function UserNavbar() {
    const navigate = useNavigate();
    const location = useLocation();

    // Parse User Data Safely
    const user = JSON.parse(localStorage.getItem('user')) || {};

    // Check Roles
    // 'level_1' or 'super_admin' is the Boss. 'level_0' is the Staff.
    const isLevel1 = user.role === 'level_1' || user.role === 'super_admin';
    const isLevel0 = user.role === 'level_0';
    const roleLabel = isLevel1 ? 'Admin' : (isLevel0 ? 'Staff' : 'User');

    // --- SEARCH STATES ---
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    const logout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Helper for active link styling
    const isActive = (path) => location.pathname === path ? 'active fw-bold text-primary' : 'text-secondary';

    // --- LIVE SEARCH FUNCTION ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 1) {
                try {
                    const res = await api.get(`/api/global-search?query=${query}`);
                    setResults(res.data);
                    setShowDropdown(true);
                } catch (error) {
                    console.error("Search Error", error);
                }
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Handle Click on Search Result
    const handleSelectResult = (item) => {
        setQuery("");
        setShowDropdown(false);
        navigate(item.link); // Navigate based on backend link
    };

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchRef]);

    return (
        <nav className="navbar navbar-expand-lg bg-white shadow-sm sticky-top py-2">
            <div className="container-fluid px-4">

                {/* 1. BRAND */}
                <Link className="navbar-brand fw-bold text-primary fs-4 me-4" to="/dashboard">
                    <i className="bi bi-car-front-fill me-2"></i>Prince RTO
                </Link>

                <button className="navbar-toggler border-0" type="button" onClick={() => setIsOpen(!isOpen)}>
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className={`collapse navbar-collapse ${isOpen ? 'show' : ''} mt-2 mt-lg-0`}>

                    {/* 2. MENU LINKS */}
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0 fw-semibold" style={{fontSize: '0.9rem'}}>

                        {/* Common Links (Visible to Everyone) */}
                        <li className="nav-item"><Link className={`nav-link ${isActive('/dashboard')}`} to="/dashboard" onClick={()=>setIsOpen(false)}>Dashboard</Link></li>
                        <li className="nav-item"><Link className={`nav-link ${isActive('/citizens')}`} to="/citizens" onClick={()=>setIsOpen(false)}>Citizens</Link></li>
                        <li className="nav-item"><Link className={`nav-link ${isActive('/reports/expiry')}`} to="/reports/expiry" onClick={()=>setIsOpen(false)}>Expiry Reports</Link></li>
                        <li className="nav-item"><Link className={`nav-link ${isActive('/cash-flow')}`} to="/cash-flow" onClick={()=>setIsOpen(false)}>Cash Flow</Link></li>
                        <li className="nav-item"><Link className={`nav-link ${isActive('/license-flow')}`} to="/license-flow" onClick={()=>setIsOpen(false)}>LL/DL Flow</Link></li>

                        {/* Admin Only Links (Level 1) */}
                        {isLevel1 && (
                            <>
                                <li className="nav-item"><Link className={`nav-link ${isActive('/work-book')}`} to="/work-book" onClick={()=>setIsOpen(false)}>Work Book</Link></li>
                                <li className="nav-item"><Link className={`nav-link ${isActive('/settings')}`} to="/settings" onClick={()=>setIsOpen(false)}>Settings</Link></li>
                                <li className="nav-item"><Link className={`nav-link ${isActive('/backup')}`} to="/backup" onClick={()=>setIsOpen(false)}>Backup</Link></li>
                                <li className="nav-item"><Link className={`nav-link ${isActive('/bulk-import')}`} to="/bulk-import" onClick={()=>setIsOpen(false)}>Bulk Import</Link></li>
                                <li className="nav-item"><Link className={`nav-link ${isActive('/manage-staff')}`} to="/manage-staff" onClick={()=>setIsOpen(false)}>Manage Staff</Link></li>
                            </>
                        )}
                    </ul>

                    {/* 3. SEARCH BAR (CENTERED & LARGER) */}
                    <div className="mx-auto position-relative w-100 me-3" style={{maxWidth: '350px'}} ref={searchRef}>
                        <div className="input-group input-group-sm">
                            <span className="input-group-text bg-light border-end-0 rounded-start-pill ps-3"><i className="bi bi-search text-muted"></i></span>
                            <input
                                type="text"
                                className="form-control bg-light border-start-0 rounded-end-pill"
                                placeholder="Search..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onFocus={() => query.length > 1 && setShowDropdown(true)}
                                style={{boxShadow: 'none'}}
                            />
                        </div>

                        {/* LIVE DROPDOWN RESULTS */}
                        {showDropdown && (
                            <div className="position-absolute w-100 mt-2 bg-white border rounded-3 shadow-lg overflow-hidden" style={{zIndex: 1050, maxHeight: '400px', overflowY: 'auto'}}>
                                {results.length > 0 ? (
                                    results.map((res, index) => (
                                        <div
                                            key={index}
                                            className="p-2 border-bottom d-flex justify-content-between align-items-center"
                                            style={{cursor: 'pointer', transition: '0.2s'}}
                                            onClick={() => handleSelectResult(res)}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div style={{maxWidth: '75%'}}>
                                                <div className="fw-bold text-dark small text-truncate">{res.title}</div>
                                                <small className="text-muted" style={{fontSize: '10px'}}>{res.subtitle}</small>
                                            </div>
                                            <span className={`badge ${
                                                res.type === 'Citizen' ? 'bg-primary' :
                                                res.type === 'Vehicle' ? 'bg-secondary' :
                                                res.type === 'License' ? 'bg-info text-dark' : 'bg-warning text-dark'
                                            }`} style={{fontSize:'9px'}}>
                                                {res.type}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-muted small">No results found</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 4. USER PROFILE */}
                    <div className="d-flex align-items-center border-start ps-3 gap-3">
                         <div className="d-flex align-items-center">
                            <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{width:'35px', height:'35px', fontSize:'14px'}}>
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="lh-1 d-none d-lg-block">
                                <small className="text-muted d-block" style={{fontSize: '9px'}}>
                                    {roleLabel}
                                </small>
                                <span className="fw-bold text-dark small text-truncate" style={{maxWidth:'100px', display:'inline-block'}}>{user.name}</span>
                            </div>
                        </div>
                        <button onClick={logout} className="btn btn-outline-danger btn-sm rounded-1 px-2" style={{fontSize: '12px'}}>Logout</button>
                    </div>

                </div>
            </div>
        </nav>
    );
}
