import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";
import UserNavbar from "./UserNavbar";

export default function CreateCitizen() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', mobile_number: '', email: '', birth_date: '',
        relation_type: '', relation_name: '', address: '', state: '', city_district: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/citizens', formData);
            toast.success("Citizen Registered Successfully!");
            navigate('/citizens');
        } catch (error) {
            console.error(error);
            toast.error("Error registering. Check fields.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-light min-vh-100 d-flex flex-column">
            <UserNavbar />
            <div className="container mt-4 flex-grow-1">
                <div className="card shadow-sm border-0">
                    <div className="card-header bg-primary text-white py-3"><h5 className="mb-0 fw-bold">Register New Citizen</h5></div>
                    <div className="card-body p-4">
                        <form onSubmit={handleSubmit}>
                            <div className="row mb-3">
                                <div className="col-md-6"><label className="form-label fw-bold small">Full Name *</label><input type="text" name="name" className="form-control" onChange={handleChange} required /></div>
                                <div className="col-md-6"><label className="form-label fw-bold small">Mobile Number *</label><input type="text" name="mobile_number" className="form-control" onChange={handleChange} required /></div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6"><label className="form-label fw-bold small">Email</label><input type="email" name="email" className="form-control" onChange={handleChange} /></div>
                                <div className="col-md-6"><label className="form-label fw-bold small">Date of Birth</label><input type="date" name="birth_date" className="form-control" onChange={handleChange} /></div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6"><label className="form-label fw-bold small">Relation Type</label><select name="relation_type" className="form-select" onChange={handleChange}><option value="">Select...</option><option value="Father">Father</option><option value="Husband">Husband</option><option value="Wife">Wife</option></select></div>
                                <div className="col-md-6"><label className="form-label fw-bold small">Relation Name</label><input type="text" name="relation_name" className="form-control" onChange={handleChange} /></div>
                            </div>
                            <div className="mb-3"><label className="form-label fw-bold small">Address</label><textarea name="address" className="form-control" rows="2" onChange={handleChange}></textarea></div>
                            <div className="row mb-4">
                                <div className="col-md-6"><label className="form-label fw-bold small">State</label><input type="text" name="state" className="form-control" onChange={handleChange} /></div>
                                <div className="col-md-6"><label className="form-label fw-bold small">City / District</label><input type="text" name="city_district" className="form-control" onChange={handleChange} /></div>
                            </div>
                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <button type="button" className="btn btn-secondary" onClick={() => navigate('/citizens')}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save & Continue'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
