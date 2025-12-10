import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';

export default function LicenseFlow() {
    const [list, setList] = useState([]);

    // Filters
    const [search, setSearch] = useState("");
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [step, setStep] = useState(1);
    const [editingId, setEditingId] = useState(null);
    const [enterDL, setEnterDL] = useState(false);

    // Form State
    const [form, setForm] = useState({
        applicant_name: "", dob: "", mobile_number: "", application_no: "", address: "",
        ll_number: "", categories: [], ll_valid_from: "", ll_valid_upto: "", ll_status: "Form Complete",
        dl_status: "", dl_app_no: "", dl_number: "", dl_valid_from: "", dl_valid_upto: ""
    });

    const categoryOptions = ["MCWG", "MCWOG", "LMV", "TRANS", "ERIK", "OTHERS"];
    const llStatuses = ["Form Complete", "LL Approved", "Test Pending", "Test Failed"];
    const dlStatuses = ["Processing Office", "Form Completed", "RTO Side Pending", "DL Done"];

    useEffect(() => { fetchLicenses(); }, [search, dateRange]);

    const fetchLicenses = async () => {
        try {
            const params = new URLSearchParams();
            if(search) params.append('search', search);
            if(dateRange.from) params.append('from_date', dateRange.from);
            if(dateRange.to) params.append('to_date', dateRange.to);

            const res = await api.get(`/api/licenses?${params.toString()}`);
            setList(res.data);
        } catch (error) { console.error(error); }
    };

    const handleCategoryChange = (e) => {
        const val = e.target.value;
        setForm(prev => {
            const newCats = e.target.checked ? [...prev.categories, val] : prev.categories.filter(c => c !== val);
            return { ...prev, categories: newCats };
        });
    };

    const handleStep1Submit = (e) => {
        e.preventDefault();
        if (enterDL) setStep(2); else finalSubmit();
    };

    const finalSubmit = async () => {
        try {
            const payload = { ...form };
            if(editingId) {
                await api.put(`/api/licenses/${editingId}`, payload);
                toast.success("License Updated");
            } else {
                await api.post('/api/licenses', payload);
                toast.success("License Added");
            }
            setShowModal(false);
            fetchLicenses();
        } catch (error) { toast.error("Failed"); }
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setForm({ ...item, categories: item.categories ? item.categories.split(',') : [] });
        setStep(1);
        setEnterDL(!!item.dl_number);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if(!confirm("Delete?")) return;
        try { await api.delete(`/api/licenses/${id}`); toast.success("Deleted"); fetchLicenses(); } catch (e) { toast.error("Failed"); }
    };

    const resetForm = () => {
        setEditingId(null); setStep(1); setEnterDL(false);
        setForm({
            applicant_name: "", dob: "", mobile_number: "", application_no: "", address: "",
            ll_number: "", categories: [], ll_valid_from: "", ll_valid_upto: "", ll_status: "Form Complete",
            dl_status: "", dl_app_no: "", dl_number: "", dl_valid_from: "", dl_valid_upto: ""
        });
        setShowModal(true);
    };

    // Helper for Validity Column
    const formatValidity = (from, to) => {
        if (!from && !to) return '-';
        return (
            <div style={{fontSize: '11px', lineHeight: '1.2'}}>
                <div>{from ? new Date(from).toLocaleDateString('en-GB') : 'N/A'}</div>
                <div className="text-muted fw-bold">to</div>
                <div>{to ? new Date(to).toLocaleDateString('en-GB') : 'N/A'}</div>
            </div>
        );
    };

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />
            <div className="container mt-4 pb-5">

                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold text-dark"><i className="bi bi-person-vcard text-primary me-2"></i> LL / DL Registry</h4>
                    <button onClick={resetForm} className="btn btn-primary fw-bold px-4"><i className="bi bi-plus-lg"></i> New Entry</button>
                </div>

                {/* FILTERS */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body p-3">
                        <div className="row g-2 align-items-end">
                            <div className="col-md-6">
                                <label className="small fw-bold text-muted">Search</label>
                                <input type="text" className="form-control" placeholder="Name, Mobile, App No, LL/DL No..." value={search} onChange={e=>setSearch(e.target.value)} />
                            </div>
                            <div className="col-6 col-md-3">
                                <label className="small fw-bold text-muted">From (Entry Date)</label>
                                <input type="date" className="form-control" value={dateRange.from} onChange={e=>setDateRange({...dateRange, from: e.target.value})} />
                            </div>
                            <div className="col-6 col-md-3">
                                <label className="small fw-bold text-muted">To</label>
                                <input type="date" className="form-control" value={dateRange.to} onChange={e=>setDateRange({...dateRange, to: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle text-nowrap">
                            <thead className="table-light text-center">
                                <tr>
                                    <th>#</th>
                                    <th className="text-start">Applicant</th>
                                    <th>Status (LL)</th>
                                    <th>Status (DL)</th>
                                    <th>Category</th>
                                    <th>LL Validity</th>
                                    <th>DL Validity</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-center">
                                {list.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="text-muted fw-bold">{index + 1}</td>
                                        <td className="text-start">
                                            <div className="fw-bold text-primary">{item.applicant_name}</div>
                                            <small className="text-muted"><i className="bi bi-phone"></i> {item.mobile_number}</small>
                                        </td>
                                        <td><span className="badge bg-info text-dark">{item.ll_status}</span></td>
                                        <td>{item.dl_status ? <span className="badge bg-success">{item.dl_status}</span> : <span className="text-muted">-</span>}</td>
                                        <td><small className="fw-bold text-secondary">{item.categories || '-'}</small></td>

                                        {/* Merged Columns for Validity */}
                                        <td>{formatValidity(item.ll_valid_from, item.ll_valid_upto)}</td>
                                        <td>{formatValidity(item.dl_valid_from, item.dl_valid_upto)}</td>

                                        <td>
                                            <button onClick={()=>openEdit(item)} className="btn btn-sm btn-link text-primary"><i className="bi bi-pencil-square"></i></button>
                                            <button onClick={()=>handleDelete(item.id)} className="btn btn-sm btn-link text-danger"><i className="bi bi-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                                {list.length === 0 && <tr><td colSpan="8" className="text-center py-5 text-muted">No records found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL (Same logic as before) */}
            {showModal && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-dark text-white">
                                <h5 className="modal-title fw-bold">{step === 1 ? 'Step 1: LL Details' : 'Step 2: DL Details'}</h5>
                                <button className="btn-close btn-close-white" onClick={()=>setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                {step === 1 && (
                                    <form onSubmit={handleStep1Submit}>
                                        <div className="row g-3">
                                            <div className="col-md-6"><label className="small fw-bold">Name *</label><input type="text" className="form-control" value={form.applicant_name} onChange={e=>setForm({...form, applicant_name:e.target.value.toUpperCase()})} required /></div>
                                            <div className="col-md-3"><label className="small fw-bold">DOB *</label><input type="date" className="form-control" value={form.dob} onChange={e=>setForm({...form, dob:e.target.value})} required /></div>
                                            <div className="col-md-3"><label className="small fw-bold">Mobile *</label><input type="number" className="form-control" value={form.mobile_number} onChange={e=>setForm({...form, mobile_number:e.target.value})} required /></div>
                                            <div className="col-md-4"><label className="small fw-bold">App No</label><input type="text" className="form-control" value={form.application_no} onChange={e=>setForm({...form, application_no:e.target.value.toUpperCase()})} /></div>
                                            <div className="col-md-4"><label className="small fw-bold">LL No</label><input type="text" className="form-control" value={form.ll_number} onChange={e=>setForm({...form, ll_number:e.target.value.toUpperCase()})} /></div>
                                            <div className="col-md-4"><label className="small fw-bold">Status</label><select className="form-select" value={form.ll_status} onChange={e=>setForm({...form, ll_status:e.target.value})}>{llStatuses.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                                            <div className="col-12"><label className="small fw-bold">Address</label><input type="text" className="form-control" value={form.address} onChange={e=>setForm({...form, address:e.target.value.toUpperCase()})} /></div>
                                            <div className="col-12"><label className="small fw-bold d-block mb-2">Category</label><div className="d-flex flex-wrap gap-3">{categoryOptions.map(cat => (<div className="form-check" key={cat}><input className="form-check-input" type="checkbox" value={cat} checked={form.categories.includes(cat)} onChange={handleCategoryChange} /><label className="form-check-label small">{cat}</label></div>))}</div></div>
                                            <div className="col-md-6"><label className="small fw-bold">LL Valid From</label><input type="date" className="form-control" value={form.ll_valid_from} onChange={e=>setForm({...form, ll_valid_from:e.target.value})} /></div>
                                            <div className="col-md-6"><label className="small fw-bold">LL Valid Upto</label><input type="date" className="form-control" value={form.ll_valid_upto} onChange={e=>setForm({...form, ll_valid_upto:e.target.value})} /></div>
                                        </div>
                                        <div className="bg-light p-3 mt-4 rounded border"><label className="fw-bold small d-block mb-2">Enter DL Details?</label><div className="d-flex gap-4"><div className="form-check"><input className="form-check-input" type="radio" name="enterDL" id="dlNo" checked={!enterDL} onChange={()=>setEnterDL(false)} /><label className="form-check-label" htmlFor="dlNo">No (Save LL Only)</label></div><div className="form-check"><input className="form-check-input" type="radio" name="enterDL" id="dlYes" checked={enterDL} onChange={()=>setEnterDL(true)} /><label className="form-check-label fw-bold text-primary" htmlFor="dlYes">Yes (Go to DL)</label></div></div></div>
                                        <div className="mt-3 text-end"><button type="submit" className={`btn fw-bold px-4 ${enterDL ? 'btn-primary' : 'btn-success'}`}>{enterDL ? 'Next ➝' : 'Save Entry'}</button></div>
                                    </form>
                                )}
                                {step === 2 && (
                                    <div>
                                        <div className="alert alert-info py-2 small mb-3"><strong>Applicant:</strong> {form.applicant_name}</div>
                                        <div className="row g-3">
                                            <div className="col-md-6"><label className="small fw-bold">DL Status</label><select className="form-select" value={form.dl_status} onChange={e=>setForm({...form, dl_status:e.target.value})}><option value="">Select...</option>{dlStatuses.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                                            <div className="col-md-6"><label className="small fw-bold">DL App No</label><input type="text" className="form-control" value={form.dl_app_no} onChange={e=>setForm({...form, dl_app_no:e.target.value.toUpperCase()})} /></div>
                                            <div className="col-md-12"><label className="small fw-bold">DL Number</label><input type="text" className="form-control fw-bold" value={form.dl_number} onChange={e=>setForm({...form, dl_number:e.target.value.toUpperCase()})} /></div>
                                            <div className="col-md-6"><label className="small fw-bold">DL Valid From</label><input type="date" className="form-control" value={form.dl_valid_from} onChange={e=>setForm({...form, dl_valid_from:e.target.value})} /></div>
                                            <div className="col-md-6"><label className="small fw-bold">DL Valid Upto</label><input type="date" className="form-control" value={form.dl_valid_upto} onChange={e=>setForm({...form, dl_valid_upto:e.target.value})} /></div>
                                        </div>
                                        <div className="mt-4 d-flex justify-content-between"><button onClick={()=>setStep(1)} className="btn btn-secondary">Back</button><button onClick={finalSubmit} className="btn btn-success fw-bold px-4">Save Final</button></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
