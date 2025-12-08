import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        tax_days: 15,
        insurance_days: 15,
        fitness_days: 15,
        permit_days: 15,
        pucc_days: 7,
        vltd_days: 15,
        speed_gov_days: 15
    });

    useEffect(() => {
        api.get('/api/settings/notifications')
            .then(res => { setForm(res.data); setLoading(false); })
            .catch(err => setLoading(false));
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: parseInt(e.target.value) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/settings/notifications', form);
            toast.success("Settings Saved Successfully!");
        } catch (error) {
            toast.error("Failed to save.");
        }
    };

    const SettingRow = ({ label, name, value }) => (
        <div className="col-md-6 mb-3">
            <label className="form-label fw-bold text-muted small">{label}</label>
            <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-calendar-event"></i></span>
                <input
                    type="number"
                    className="form-control fw-bold"
                    name={name}
                    value={value}
                    onChange={handleChange}
                    min="1" max="60"
                />
                <span className="input-group-text bg-light">Days Before</span>
            </div>
        </div>
    );

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />
            <div className="container mt-4" style={{ maxWidth: '800px' }}>

                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white py-3">
                        <h5 className="mb-0 fw-bold text-primary"><i className="bi bi-gear-fill me-2"></i> Automation Settings</h5>
                    </div>
                    <div className="card-body p-4">
                        <div className="alert alert-info small mb-4">
                            <i className="bi bi-info-circle me-2"></i>
                            Configure how many days <strong>before expiry</strong> the system should automatically send a WhatsApp message to the customer.
                        </div>

                        {loading ? <div className="text-center py-5">Loading...</div> : (
                            <form onSubmit={handleSubmit}>
                                <div className="row">
                                    <SettingRow label="Road Tax" name="tax_days" value={form.tax_days} />
                                    <SettingRow label="Insurance" name="insurance_days" value={form.insurance_days} />
                                    <SettingRow label="Fitness" name="fitness_days" value={form.fitness_days} />
                                    <SettingRow label="Permit" name="permit_days" value={form.permit_days} />
                                    <SettingRow label="PUCC (Pollution)" name="pucc_days" value={form.pucc_days} />
                                    <SettingRow label="VLTD" name="vltd_days" value={form.vltd_days} />
                                    <SettingRow label="Speed Governor" name="speed_gov_days" value={form.speed_gov_days} />
                                </div>

                                <div className="d-grid mt-4">
                                    <button className="btn btn-primary fw-bold py-2">Save Settings</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
