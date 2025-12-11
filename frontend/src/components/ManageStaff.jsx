import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';

export default function ManageStaff() {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Form State
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [editingId, setEditingId] = useState(null); // Track if we are editing

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setFetching(true);
        try {
            const res = await api.get('/api/staff');
            setStaffList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            toast.error("Failed to load staff list");
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                // UPDATE EXISTING
                await api.put(`/api/staff/${editingId}`, form);
                toast.success("Staff Updated Successfully!");
                setEditingId(null);
            } else {
                // CREATE NEW
                await api.post('/api/staff', form);
                toast.success("Staff Account Created!");
            }
            // Reset Form
            setForm({ name: "", email: "", password: "" });
            fetchStaff();
        } catch (error) {
            const msg = error.response?.data?.message || "Operation Failed";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (staff) => {
        setEditingId(staff.id);
        setForm({
            name: staff.name,
            email: staff.email,
            password: "" // Blank means don't change
        });
        // Scroll to top to see form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm({ name: "", email: "", password: "" });
    };

    const handleDelete = async (id) => {
        if(!confirm("Are you sure? This staff member will lose access immediately.")) return;
        try {
            await api.delete(`/api/staff/${id}`);
            toast.success("Staff Removed");
            fetchStaff();
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />
            <div className="container mt-4" style={{maxWidth: '900px'}}>

                <h4 className="fw-bold mb-4 text-dark"><i className="bi bi-people-fill text-primary me-2"></i> Manage Team</h4>

                {/* FORM CARD */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                        <span className="fw-bold text-primary">
                            {editingId ? "Edit Staff Details" : "Create New Login"}
                        </span>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="btn btn-sm btn-outline-secondary">
                                Cancel Edit
                            </button>
                        )}
                    </div>
                    <div className="card-body p-4">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3 align-items-end">
                                <div className="col-md-4">
                                    <label className="form-label small fw-bold text-muted">Staff Name</label>
                                    <input type="text" className="form-control" placeholder="e.g. Rahul" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-bold text-muted">Login Email</label>
                                    <input type="email" className="form-control" placeholder="rahul@rto.com" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label small fw-bold text-muted">
                                        Password {editingId && <span className="text-danger" style={{fontSize:'10px'}}>(Leave empty to keep same)</span>}
                                    </label>
                                    <input type="text" className="form-control" placeholder={editingId ? "New Password (Optional)" : "Min 6 chars"} value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required={!editingId} />
                                </div>
                                <div className="col-md-1">
                                    <button type="submit" className={`btn w-100 fw-bold ${editingId ? 'btn-warning' : 'btn-primary'}`} disabled={loading}>
                                        {loading ? '...' : (editingId ? 'Save' : '+')}
                                    </button>
                                </div>
                            </div>
                            {!editingId && (
                                <div className="form-text mt-2 ms-1">
                                    <i className="bi bi-info-circle me-1"></i>
                                    This user will have <strong>View Only</strong> access to your data.
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* STAFF LIST */}
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white py-3 fw-bold">Your Staff Members ({staffList.length})</div>
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">Name</th>
                                    <th>Login ID</th>
                                    <th>Access Level</th>
                                    <th className="text-end pe-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fetching ? (
                                    <tr><td colSpan="4" className="text-center py-5">Loading team...</td></tr>
                                ) : staffList.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-5 text-muted">No staff members found. Add one above.</td></tr>
                                ) : (
                                    staffList.map((staff) => (
                                        <tr key={staff.id} className={editingId === staff.id ? "table-warning" : ""}>
                                            <td className="ps-4 fw-bold text-primary">{staff.name}</td>
                                            <td className="fw-bold text-dark">{staff.email}</td>
                                            <td><span className="badge bg-secondary-subtle text-secondary border">View Only (Level 0)</span></td>
                                            <td className="text-end pe-4">
                                                <button onClick={()=>handleEdit(staff)} className="btn btn-sm btn-link text-primary me-2">
                                                    <i className="bi bi-pencil-square fs-5"></i>
                                                </button>
                                                <button onClick={()=>handleDelete(staff.id)} className="btn btn-sm btn-link text-danger">
                                                    <i className="bi bi-trash fs-5"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
