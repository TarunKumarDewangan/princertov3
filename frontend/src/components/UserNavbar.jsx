import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api"; // <--- USE CENTRAL API CONFIG

export default function UserNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));

    // --- SEARCH STATES ---
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    // --- MOBILE MENU STATE ---
    const [isOpen, setIsOpen] = useState(false);

    // Logout
    const logout = () => {
        localStorage.clear();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path ? 'active fw-bold text-primary' : 'text-secondary';

    // --- SEARCH FUNCTION ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 1) {
                try {
                    // Using central API instance (No hardcoded URL)
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
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelectResult = (citizenId) => {
        navigate(`/citizens/${citizenId}`);
        setQuery("");
        setShowDropdown(false);
    };

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
                <Link className="navbar-brand fw-bold text-primary fs-4" to="/dashboard">
                    <i className="bi bi-car-front-fill me-2"></i>RTO Hub
                </Link>

                <button className="navbar-toggler border-0" type="button" onClick={() => setIsOpen(!isOpen)}>
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className={`collapse navbar-collapse ${isOpen ? 'show' : ''} mt-2 mt-lg-0`}>

                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item"><Link className={`nav-link ${isActive('/dashboard')}`} to="/dashboard" onClick={()=>setIsOpen(false)}>Dashboard</Link></li>
                        <li className="nav-item"><Link className={`nav-link ${isActive('/citizens')}`} to="/citizens" onClick={()=>setIsOpen(false)}>Citizens</Link></li>
                        <li className="nav-item"><Link className={`nav-link ${isActive('/reports/expiry')}`} to="/reports/expiry" onClick={()=>setIsOpen(false)}>Expiry Reports</Link></li>
                        <li className="nav-item"><Link className={`nav-link ${isActive('/backup')}`} to="/backup" onClick={()=>setIsOpen(false)}>Backup</Link></li>
                    </ul>

                    {/* --- SEARCH BAR --- */}
                    <div className="mx-lg-4 position-relative w-100" style={{maxWidth: '400px'}} ref={searchRef}>
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                            <input
                                type="text"
                                className="form-control bg-light border-start-0"
                                placeholder="Search Name, Vehicle, Mobile..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onFocus={() => query.length > 1 && setShowDropdown(true)}
                            />
                            {query && (
                                <button className="btn btn-light border border-start-0" onClick={() => {setQuery(''); setShowDropdown(false);}}>
                                    <i className="bi bi-x"></i>
                                </button>
                            )}
                        </div>

                        {showDropdown && (
                            <div className="position-absolute w-100 mt-1 bg-white border rounded shadow-lg overflow-hidden" style={{zIndex: 1050, maxHeight: '300px', overflowY: 'auto'}}>
                                {results.length > 0 ? (
                                    results.map((res, index) => (
                                        <div
                                            key={index}
                                            className="p-2 border-bottom d-flex justify-content-between align-items-center"
                                            style={{cursor: 'pointer'}}
                                            onClick={() => handleSelectResult(res.id)}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div>
                                                <div className="fw-bold text-dark">{res.title}</div>
                                                <small className="text-muted">{res.subtitle}</small>
                                            </div>
                                            <span className="badge bg-secondary text-uppercase" style={{fontSize:'10px'}}>{res.type}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-muted small">No results found</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="d-flex align-items-center justify-content-between border-top pt-3 pt-lg-0 border-lg-0 mt-3 mt-lg-0">
                         <div className="d-flex align-items-center">
                            <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{width:'35px', height:'35px'}}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="lh-1 d-none d-lg-block">
                                <small className="text-muted d-block" style={{fontSize: '10px'}}>Signed in as</small>
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
