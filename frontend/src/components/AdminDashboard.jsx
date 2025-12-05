import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // ADDED: 'role' field defaults to level_1
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "level_1",
        whatsapp_key: "",
        whatsapp_host: ""
    });

    const [testMobile, setTestMobile] = useState("");
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        // SECURITY: Only super_admin can see this page
        if (!user || user.role !== 'super_admin') {
            navigate('/');
        } else {
            fetchUsers();
        }
    }, [navigate]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/users');
            setUsers(res.data);
            setLoading(false);
        } catch (error) { toast.error("Failed to load users."); }
    };

    const handleTestWhatsApp = async () => {
        if (!formData.whatsapp_key || !formData.whatsapp_host) return toast.error("Enter API Key/Host");
        if (!testMobile || testMobile.length !== 10) return toast.error("Enter 10-digit mobile");
        setTesting(true);
        try {
            await api.post('/api/admin/test-whatsapp', { mobile: testMobile, whatsapp_key: formData.whatsapp_key, whatsapp_host: formData.whatsapp_host });
            toast.success("Message Sent!");
        } catch (error) { toast.error("Message Failed."); }
        finally { setTesting(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/api/users/${currentUserId}`, formData);
                toast.success("User updated!");
            } else {
                await api.post('/api/users', formData);
                toast.success("User created!");
            }
            setShowModal(false);
            fetchUsers();
        } catch (error) { toast.error("Operation failed."); }
    };

    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const openCreateModal = () => {
        setIsEditing(false);
        setFormData({ name: "", email: "", password: "", role: "level_1", whatsapp_key: "", whatsapp_host: "" });
        setTestMobile("");
        setShowModal(true);
    };

    const openEditModal = (u) => {
        setIsEditing(true);
        setCurrentUserId(u.id);
        setFormData({
            name: u.name,
            email: u.email,
            password: "",
            role: u.role || "level_1", // Load existing role
            whatsapp_key: u.whatsapp_key || "",
            whatsapp_host: u.whatsapp_host || ""
        });
        setTestMobile("");
        setShowModal(true);
    };

    const toggleStatus = async (id) => { try { await api.patch(`/api/users/${id}/status`); toast.success("Status updated"); fetchUsers(); } catch (e) {} };
    const deleteUser = async (id) => { if(confirm("Delete?")) { await api.delete(`/api/users/${id}`); toast.success("Deleted"); fetchUsers(); } };
    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    return (
        <div className="bg-light min-vh-100 d-flex flex-column">
             <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm px-3">
                <div className="container-fluid">
                    <span className="navbar-brand fw-bold">Prince RTO <span className="badge bg-danger ms-2" style={{fontSize: '10px'}}>SUPER ADMIN</span></span>
                    <button className="navbar-toggler border-0" type="button" onClick={() => setIsMenuOpen(!isMenuOpen)}><span className="navbar-toggler-icon"></span></button>
                    <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`}>
                        <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
                            <li className="nav-item text-white me-3 my-2 my-lg-0"><small>Signed in as <span className="fw-bold">{user?.name}</span></small></li>
                            <li className="nav-item"><button onClick={handleLogout} className="btn btn-outline-light btn-sm w-100"><i className="bi bi-box-arrow-right me-1"></i> Logout</button></li>
                        </ul>
                    </div>
                </div>
            </nav>

            <div className="container mt-4 flex-grow-1 pb-5">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                    <h3 className="text-primary fw-bold m-0">Staff Management</h3>
                    <button onClick={openCreateModal} className="btn btn-success shadow-sm w-100 w-md-auto"><i className="bi bi-person-plus-fill me-2"></i> Create Staff User</button>
                </div>

                <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle text-nowrap">
                                <thead className="table-light">
                                    <tr>
                                        <th className="ps-4">Name</th>
                                        <th>Email</th>
                                        <th>Role</th> {/* NEW COLUMN */}
                                        <th>WhatsApp</th>
                                        <th>Status</th>
                                        <th className="text-end pe-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
                                    ) : users.length > 0 ? (
                                        users.map(u => (
                                            <tr key={u.id}>
                                                <td className="ps-4 fw-bold">{u.name}</td>
                                                <td>{u.email}</td>

                                                {/* DISPLAY ROLE */}
                                                <td>
                                                    {u.role === 'level_1'
                                                        ? <span className="badge bg-primary">Level 1 (Full)</span>
                                                        : <span className="badge bg-secondary">Level 0 (Restricted)</span>
                                                    }
                                                </td>

                                                <td>{u.whatsapp_key ? (<span className="badge bg-info text-dark">Configured</span>) : (<span className="badge bg-secondary">Not Set</span>)}</td>
                                                <td><button onClick={() => toggleStatus(u.id)} className={`badge border-0 ${u.is_active ? 'bg-success' : 'bg-danger'}`} style={{cursor: 'pointer'}}>{u.is_active ? 'Active' : 'Inactive'}</button></td>
                                                <td className="text-end pe-4"><button onClick={() => openEditModal(u)} className="btn btn-sm btn-primary me-2"><i className="bi bi-pencil-square"></i> Edit</button><button onClick={() => deleteUser(u.id)} className="btn btn-sm btn-danger"><i className="bi bi-trash"></i></button></td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="text-center py-4 text-muted">No staff found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-white border-bottom-0">
                                <h5 className="modal-title fw-bold text-primary">{isEditing ? 'Edit Staff' : 'Add New Staff'}</h5>
                                <button className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body pt-0">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small">Full Name</label>
                                        <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small">Email Address</label>
                                        <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small">Password {isEditing && <span className="text-muted fw-normal">(Leave blank to keep current)</span>}</label>
                                        <input type="password" name="password" className="form-control" value={formData.password} onChange={handleInputChange} required={!isEditing} />
                                    </div>

                                    {/* --- ROLE SELECTOR --- */}
                                    <div className="mb-3 p-3 bg-light rounded border">
                                        <label className="form-label fw-bold small text-primary">Access Level / Role</label>
                                        <select className="form-select" name="role" value={formData.role} onChange={handleInputChange}>
                                            <option value="level_1">Level 1 - Full Power (Can Delete/Backup)</option>
                                            <option value="level_0">Level 0 - Restricted (Entry Only)</option>
                                        </select>
                                    </div>

                                    <hr className="text-muted my-4"/>
                                    <h6 className="text-primary fw-bold mb-3"><i className="bi bi-whatsapp me-2"></i>WhatsApp Config</h6>

                                    <div className="row g-2">
                                        <div className="col-12"><label className="form-label small text-muted">API Key</label><input type="text" name="whatsapp_key" className="form-control" placeholder="Enter API Key" value={formData.whatsapp_key} onChange={handleInputChange} /></div>
                                        <div className="col-12 mt-2"><label className="form-label small text-muted">API Host URL</label><input type="text" name="whatsapp_host" className="form-control" placeholder="e.g. api.wa-sender.com" value={formData.whatsapp_host} onChange={handleInputChange} /></div>
                                    </div>

                                    <div className="bg-light p-3 rounded border mt-3">
                                        <label className="form-label small fw-bold text-secondary">Test Connection</label>
                                        <div className="input-group input-group-sm">
                                            <input type="text" className="form-control" placeholder="Enter Mobile No (10 digit)" value={testMobile} onChange={(e) => setTestMobile(e.target.value)} />
                                            <button type="button" className="btn btn-info text-white" onClick={handleTestWhatsApp} disabled={testing}>{testing ? (<span><span className="spinner-border spinner-border-sm me-1"></span>Sending...</span>) : (<span><i className="bi bi-send me-1"></i> Test</span>)}</button>
                                        </div>
                                    </div>

                                    <div className="d-grid mt-4">
                                        <button type="submit" className="btn btn-primary fw-bold py-2">{isEditing ? 'Update Staff' : 'Create Staff'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
