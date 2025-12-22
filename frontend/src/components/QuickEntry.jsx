import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';

export default function QuickEntry() {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        mobile_number: "",
        registration_no: "",
        valid_from: "",
        valid_until: ""
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/quick-entry', form);
            toast.success("Saved Successfully!");
            // Reset Form
            setForm({ name: "", mobile_number: "", registration_no: "", valid_from: "", valid_until: "" });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />

            <div className="container mt-5" style={{maxWidth: '600px'}}>
                <div className="card border-0 shadow-lg">
                    <div className="card-header bg-dark text-white py-3">
                        <h5 className="mb-0 fw-bold"><i className="bi bi-lightning-charge-fill me-2 text-warning"></i> PUCC Quick Entry</h5>
                    </div>
                    <div className="card-body p-4">
                        <form onSubmit={handleSubmit}>

                            {/* Citizen Details */}
                            <h6 className="text-primary fw-bold mb-3">Customer Details</h6>
                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Owner Name *</label>
                                    <input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Mobile Number *</label>
                                    <input type="number" className="form-control" value={form.mobile_number} onChange={e => setForm({...form, mobile_number: e.target.value})} required />
                                </div>
                            </div>

                            {/* Vehicle Details */}
                            <h6 className="text-primary fw-bold mb-3 mt-4">Vehicle Details</h6>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Vehicle Reg No *</label>
                                <input type="text" className="form-control fw-bold fs-5 text-uppercase" placeholder="CG04..." value={form.registration_no} onChange={e => setForm({...form, registration_no: e.target.value.toUpperCase()})} required />
                            </div>

                            {/* PUCC Dates */}
                            <h6 className="text-primary fw-bold mb-3 mt-4">PUCC Validity</h6>
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Valid From (Start)</label>
                                    <input type="date" className="form-control" value={form.valid_from} onChange={e => setForm({...form, valid_from: e.target.value})} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Valid Upto (Expiry) *</label>
                                    <input type="date" className="form-control border-danger" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} required />
                                </div>
                            </div>

                            <div className="d-grid">
                                <button type="submit" className="btn btn-primary fw-bold py-2" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Entry'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
