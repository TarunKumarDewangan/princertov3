import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';

export default function WorkBook() {
    const [loading, setLoading] = useState(true);
    const [sendingMsgId, setSendingMsgId] = useState(false);

    // View Mode
    const [viewMode, setViewMode] = useState('daily');

    // Data State
    const [data, setData] = useState({
        clients: [],
        jobs: [],
        stats: {
            all: { bill: 0, paid: 0, due: 0 },
            daily: { bill: 0, paid: 0, due: 0 },
            filtered: { bill: 0, paid: 0, due: 0 }
        }
    });

    // Filters
    const [filters, setFilters] = useState({ client_id: "", from_date: "", to_date: "", keyword: "" });
    const [isFiltered, setIsFiltered] = useState(false);

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);

    // Forms
    const [clientForm, setClientForm] = useState({ id: null, name: "", mobile: "" });
    const [isEditingClient, setIsEditingClient] = useState(false);

    const [form, setForm] = useState({
        client_id: "",
        job_date: new Date().toISOString().split('T')[0],
        vehicle_no: "",
        description: "",
        bill_amount: "",
        paid_amount: ""
    });

    // Payment Modal State
    const [payClient, setPayClient] = useState("");
    const [payAmount, setPayAmount] = useState("");
    const [pendingList, setPendingList] = useState([]);
    const [totalDue, setTotalDue] = useState(0);

    useEffect(() => { fetchJobs(); }, []);

    // Get Current Stats based on View Mode
    const currentStats = isFiltered
        ? data.stats.filtered
        : (viewMode === 'daily' ? data.stats.daily : data.stats.all);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if(filters.client_id) params.append('client_id', filters.client_id);
            if(filters.from_date) params.append('from_date', filters.from_date);
            if(filters.to_date) params.append('to_date', filters.to_date);
            if(filters.keyword) params.append('keyword', filters.keyword);

            const res = await api.get(`/api/work-jobs?${params.toString()}`);
            setData(res.data);
            setIsFiltered(!!filters.client_id || !!filters.keyword || !!filters.from_date);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleSearch = (e) => { e.preventDefault(); fetchJobs(); };
    const clearFilters = () => { setFilters({ client_id: "", from_date: "", to_date: "", keyword: "" }); api.get('/api/work-jobs').then(res => { setData(res.data); setIsFiltered(false); }); };

    // --- SEND WHATSAPP REMINDER ---
    const handleSendReminder = async () => {
        if(!filters.client_id) return;
        if(!confirm("Send WhatsApp dues reminder to this client?")) return;

        setSendingMsgId(true);
        try {
            await api.post('/api/work-jobs/send-reminder', { client_id: filters.client_id });
            toast.success("Reminder Sent Successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send");
        } finally {
            setSendingMsgId(false);
        }
    };

    // --- SUBMIT PAYMENT ---
    useEffect(() => {
        if (payClient) {
            const fetchDues = async () => { try { const res = await api.get(`/api/work-jobs/dues/${payClient}`); setPendingList(res.data.jobs); setTotalDue(res.data.total_due); } catch (e) {} };
            fetchDues();
        } else { setPendingList([]); setTotalDue(0); }
    }, [payClient]);

    const handlePaymentSubmit = async (e) => {
        e.preventDefault(); if (!payClient || !payAmount) return toast.error("Invalid details");
        try { await api.post('/api/work-jobs/pay', { client_id: payClient, amount: payAmount }); toast.success("Payment Received!"); setShowPayModal(false); setPayClient(""); setPayAmount(""); fetchJobs(); } catch (error) { toast.error("Failed"); }
    };

    // --- CRUD Handlers ---
    const handleSubmit = async (e) => { e.preventDefault(); if (!form.client_id) return toast.error("Select Client"); try { await api.post('/api/work-jobs', form); toast.success("Work Added!"); setShowModal(false); setForm({ client_id: "", job_date: new Date().toISOString().split('T')[0], vehicle_no: "", description: "", bill_amount: "", paid_amount: "" }); fetchJobs(); } catch (error) { toast.error("Failed"); } };
    const handleDelete = async (id) => { if(!confirm("Delete this job?")) return; try { await api.delete(`/api/work-jobs/${id}`); toast.success("Deleted"); fetchJobs(); } catch (e) { toast.error("Error"); } };
    const handleSaveClient = async (e) => { e.preventDefault(); try { if (isEditingClient) { await api.put(`/api/clients/${clientForm.id}`, { name: clientForm.name.toUpperCase(), mobile: clientForm.mobile }); toast.success("Client Updated"); } else { await api.post('/api/clients', { name: clientForm.name.toUpperCase(), mobile: clientForm.mobile }); toast.success("Client Created"); } setClientForm({ id: null, name: "", mobile: "" }); setIsEditingClient(false); fetchJobs(); } catch (e) { toast.error("Operation Failed"); } };
    const handleEditClientClick = (c) => { setClientForm({ id: c.id, name: c.name, mobile: c.mobile || "" }); setIsEditingClient(true); };
    const handleDeleteClient = async (id) => { if(!confirm("Delete Client & History?")) return; try { await api.delete(`/api/clients/${id}`); toast.success("Deleted"); setClientForm({ id: null, name: "", mobile: "" }); setIsEditingClient(false); fetchJobs(); } catch (e) { toast.error("Failed"); } };

    return (
        <div className="bg-light min-vh-100">
            <div className="d-print-none"><UserNavbar /></div>

            {/* PRINT HEADER */}
            <div className="d-none d-print-block text-center mb-4 pt-4"><h2 className="fw-bold">Prince RTO - Work Register</h2><p>Generated: {new Date().toLocaleDateString()}</p></div>

            <div className="container mt-4 pb-5">

                {/* 1. STATS */}
                <div className="row g-3 mb-4 d-print-none">
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-5 border-primary">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                                <small className="text-muted fw-bold">TOTAL WORK DONE</small>
                                {!isFiltered && (
                                    <div className="btn-group btn-group-sm" role="group">
                                        <button type="button" className={`btn ${viewMode === 'daily' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('daily')}>Today</button>
                                        <button type="button" className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('all')}>All</button>
                                    </div>
                                )}
                                {isFiltered && <span className="badge bg-warning text-dark">Filtered</span>}
                            </div>
                            <h3 className="fw-bold text-primary mb-0">₹{Number(currentStats.bill).toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="col-6 col-md-4"><div className="card border-0 shadow-sm p-3 bg-success-subtle h-100"><small className="text-success fw-bold">RECEIVED</small><h3 className="fw-bold text-success mb-0">₹{Number(currentStats.paid).toLocaleString()}</h3></div></div>
                    <div className="col-6 col-md-4">
                        <div className="card border-0 shadow-sm p-3 bg-warning-subtle h-100 position-relative">
                            <small className="text-dark fw-bold">PENDING DUES</small>
                            <h3 className="fw-bold text-dark mb-0">₹{Number(currentStats.due).toLocaleString()}</h3>
                            {filters.client_id && (
                                <button onClick={handleSendReminder} className="btn btn-sm btn-success position-absolute bottom-0 end-0 m-3 fw-bold" disabled={sendingMsgId}>
                                    {sendingMsgId ? <span><span className="spinner-border spinner-border-sm me-1"></span></span> : <span><i className="bi bi-whatsapp me-1"></i> Send Due</span>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. ACTION & FILTER */}
                <div className="card border-0 shadow-sm mb-4 d-print-none">
                    <div className="card-header bg-white py-3 d-flex flex-wrap gap-2 justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold"><i className="bi bi-briefcase-fill me-2"></i> Work Book</h5>
                        <div className="d-flex gap-2">
                            <button onClick={() => { setClientForm({id:null, name:"", mobile:""}); setIsEditingClient(false); setShowClientModal(true); }} className="btn btn-outline-dark btn-sm fw-bold"><i className="bi bi-person-gear"></i> Clients</button>
                            <button onClick={() => setShowPayModal(true)} className="btn btn-success btn-sm fw-bold px-3"><i className="bi bi-cash-coin me-1"></i> Pay</button>
                            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm fw-bold px-3"><i className="bi bi-plus-lg"></i> Work</button>
                            <button onClick={() => window.print()} className="btn btn-secondary btn-sm"><i className="bi bi-printer"></i></button>
                        </div>
                    </div>
                    <div className="card-body bg-light">
                        <form onSubmit={handleSearch} className="row g-2 align-items-end">
                            <div className="col-md-3"><label className="small fw-bold text-muted">Client</label><select className="form-select form-select-sm" value={filters.client_id} onChange={e => setFilters({...filters, client_id: e.target.value})}><option value="">-- All Clients --</option>{data.clients.map(cli => <option key={cli.id} value={cli.id}>{cli.name}</option>)}</select></div>
                            <div className="col-md-2"><label className="small fw-bold text-muted">From</label><input type="date" className="form-control form-select-sm" value={filters.from_date} onChange={e => setFilters({...filters, from_date: e.target.value})} /></div>
                            <div className="col-md-2"><label className="small fw-bold text-muted">To</label><input type="date" className="form-control form-select-sm" value={filters.to_date} onChange={e => setFilters({...filters, to_date: e.target.value})} /></div>
                            <div className="col-md-3"><label className="small fw-bold text-muted">Search</label><input type="text" className="form-control form-select-sm" placeholder="Vehicle No / Work..." value={filters.keyword} onChange={e => setFilters({...filters, keyword: e.target.value})} /></div>
                            <div className="col-md-2 d-flex gap-1"><button type="submit" className="btn btn-sm btn-dark w-100 fw-bold">Filter</button>{isFiltered && <button type="button" onClick={clearFilters} className="btn btn-sm btn-outline-danger"><i className="bi bi-x-lg"></i></button>}</div>
                        </form>
                    </div>
                </div>

                {/* 3. RESPONSIVE DATA DISPLAY */}
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white py-3 fw-bold border-bottom d-print-none">Recent Entries</div>

                    {/* --- DESKTOP TABLE --- */}
                    <div className="table-responsive d-none d-md-block">
                        <table className="table table-hover mb-0 align-middle table-bordered border-light text-nowrap" style={{fontSize: '0.9rem'}}>
                            <thead className="table-light"><tr><th>Date</th><th>Client Name</th><th>Vehicle No</th><th>Work Description</th><th className="text-end">Total Bill</th><th className="text-end text-success">Paid</th><th className="text-end text-danger">Due</th><th className="text-center d-print-none">Action</th></tr></thead>
                            <tbody>
                                {loading ? (<tr><td colSpan="8" className="text-center py-5">Loading...</td></tr>) :
                                data.jobs.length > 0 ? (data.jobs.map((job) => (
                                    <tr key={job.id}>
                                        <td>{new Date(job.job_date).toLocaleDateString('en-GB')}</td>
                                        <td className="fw-bold">{job.client_name}</td>
                                        <td className="fw-bold text-primary">{job.vehicle_no || '-'}</td>
                                        <td>{job.description}</td>
                                        <td className="text-end fw-bold">₹{Number(job.bill_amount).toLocaleString()}</td>
                                        <td className="text-end text-success">₹{Number(job.paid_amount).toLocaleString()}</td>
                                        <td className="text-end text-danger fw-bold">₹{Number(job.bill_amount - job.paid_amount).toLocaleString()}</td>
                                        <td className="text-center d-print-none">
                                            <button onClick={() => handleDelete(job.id)} className="btn btn-link p-0 text-danger" title="Delete"><i className="bi bi-trash"></i></button>
                                        </td>
                                    </tr>
                                ))) : (<tr><td colSpan="8" className="text-center py-5 text-muted">No work records found.</td></tr>)}
                            </tbody>
                            <tfoot className="table-light fw-bold"><tr><td colSpan="4" className="text-end">TOTALS:</td><td className="text-end">₹{Number(currentStats.bill).toLocaleString()}</td><td className="text-end text-success">₹{Number(currentStats.paid).toLocaleString()}</td><td className="text-end text-danger">₹{Number(currentStats.due).toLocaleString()}</td><td className="d-print-none"></td></tr></tfoot>
                        </table>
                    </div>

                    {/* --- MOBILE CARD VIEW --- */}
                    <div className="d-block d-md-none bg-light p-2">
                        {loading ? (<div className="text-center py-5">Loading...</div>) :
                        data.jobs.length > 0 ? (data.jobs.map((job) => {
                            const due = job.bill_amount - job.paid_amount;
                            return (
                                <div className="card shadow-sm border-0 mb-3" key={job.id}>
                                    <div className="card-body p-3">
                                        {/* Header */}
                                        <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                            <div>
                                                <div className="fw-bold text-dark">{job.client_name}</div>
                                                <small className="text-muted"><i className="bi bi-calendar"></i> {new Date(job.job_date).toLocaleDateString('en-GB')}</small>
                                            </div>
                                            <div className="text-end">
                                                {job.vehicle_no ? <span className="badge bg-primary-subtle text-primary">{job.vehicle_no}</span> : <span className="badge bg-light text-dark border">Advance/Credit</span>}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="mb-2 text-secondary small fw-bold">
                                            {job.description}
                                        </div>

                                        {/* Financials Grid */}
                                        <div className="d-flex justify-content-between bg-light rounded p-2 mb-2 small text-center">
                                            <div><div className="text-muted">Bill</div><strong>₹{Number(job.bill_amount).toLocaleString()}</strong></div>
                                            <div><div className="text-success">Paid</div><strong className="text-success">₹{Number(job.paid_amount).toLocaleString()}</strong></div>
                                            <div><div className="text-danger">Due</div><strong className="text-danger">₹{Number(due).toLocaleString()}</strong></div>
                                        </div>

                                        {/* Actions */}
                                        <div className="text-end">
                                            <button onClick={() => handleDelete(job.id)} className="btn btn-sm btn-outline-danger border-0"><i className="bi bi-trash"></i> Delete Entry</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })) : (<div className="text-center py-5 text-muted">No records found.</div>)}

                        {/* Mobile Summary Footer */}
                        <div className="card border-0 bg-white text-center p-3 mt-3 shadow-sm">
                            <small className="text-muted fw-bold d-block mb-2">SUMMARY ({viewMode === 'daily' ? 'TODAY' : 'ALL TIME'})</small>
                            <div className="d-flex justify-content-around">
                                <div><small className="d-block text-primary">Work</small><strong>₹{Number(currentStats.bill).toLocaleString()}</strong></div>
                                <div><small className="d-block text-success">Recv</small><strong>₹{Number(currentStats.paid).toLocaleString()}</strong></div>
                                <div><small className="d-block text-danger">Due</small><strong>₹{Number(currentStats.due).toLocaleString()}</strong></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* MODALS REMAIN SAME (Paste PayModal, AddWorkModal, ClientModal here) */}
            {/* PAYMENT MODAL */}
            {showPayModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header bg-success text-white"><h5 className="modal-title fw-bold">Receive Payment</h5><button className="btn-close btn-close-white" onClick={() => setShowPayModal(false)}></button></div><div className="modal-body p-4"><div className="mb-3"><label className="form-label small fw-bold text-muted">Select Client</label><select className="form-select fw-bold" value={payClient} onChange={e => setPayClient(e.target.value)}><option value="">-- Select --</option>{data.clients.map(cli => <option key={cli.id} value={cli.id}>{cli.name}</option>)}</select></div>{payClient && (<div className="alert alert-warning d-flex justify-content-between align-items-center mb-3"><span className="small">Total Pending Dues:</span><strong className="fs-5 text-danger">₹{Number(totalDue).toLocaleString()}</strong></div>)}<div className="mb-4"><label className="form-label small fw-bold text-muted">Amount Received (₹)</label><input type="number" className="form-control fs-4 fw-bold text-success" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} disabled={!payClient} /></div><div className="d-grid"><button onClick={handlePaymentSubmit} className="btn btn-success fw-bold py-2" disabled={!payClient || !payAmount}>Confirm Payment</button></div></div></div></div></div>)}
            {/* ADD WORK MODAL */}
            {showModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header bg-primary text-white"><h5 className="modal-title fw-bold">Add New Work</h5><button className="btn-close btn-close-white" onClick={()=>setShowModal(false)}></button></div><form onSubmit={handleSubmit}><div className="modal-body p-4"><div className="row g-2 mb-3"><div className="col-6"><label className="form-label small fw-bold text-muted">Date</label><input type="date" className="form-control" value={form.job_date} onChange={e => setForm({...form, job_date: e.target.value})} required /></div><div className="col-6"><label className="form-label small fw-bold text-muted">Vehicle No (Opt)</label><input type="text" className="form-control" placeholder="CG04..." value={form.vehicle_no} onChange={e => setForm({...form, vehicle_no: e.target.value.toUpperCase()})} /></div></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Select Client</label><select className="form-select" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} required><option value="">Select...</option>{data.clients.map(cli => <option key={cli.id} value={cli.id}>{cli.name}</option>)}</select></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Work Description</label><input type="text" className="form-control" placeholder="e.g. TAX PAID" value={form.description} onChange={e => setForm({...form, description: e.target.value.toUpperCase()})} required /></div><div className="row g-2 mb-3"><div className="col-6"><label className="form-label small fw-bold text-muted">Bill Amount (₹)</label><input type="number" className="form-control fw-bold fs-5" placeholder="0" value={form.bill_amount} onChange={e => setForm({...form, bill_amount: e.target.value})} required /></div><div className="col-6"><label className="form-label small fw-bold text-muted">Received (₹)</label><input type="number" className="form-control fw-bold fs-5 text-success" placeholder="0" value={form.paid_amount} onChange={e => setForm({...form, paid_amount: e.target.value})} /></div></div></div><div className="modal-footer border-0 pt-0"><button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary fw-bold px-4">Save Work</button></div></form></div></div></div>)}
            {/* MANAGE CLIENTS MODAL */}
            {showClientModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content border-0 shadow-lg"><div className="modal-header"><h5 className="modal-title fw-bold">Manage Clients</h5><button className="btn-close" onClick={()=>setShowClientModal(false)}></button></div><div className="modal-body p-4"><form onSubmit={handleSaveClient} className="row g-2 align-items-end mb-4 border-bottom pb-4"><div className="col-md-5"><label className="form-label fw-bold small">Client Name *</label><input type="text" className="form-control" placeholder="RAVI KUMAR" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value.toUpperCase()})} required /></div><div className="col-md-4"><label className="form-label fw-bold small">Mobile</label><input type="number" className="form-control" placeholder="10-digit" value={clientForm.mobile} onChange={e => setClientForm({...clientForm, mobile: e.target.value})} /></div><div className="col-md-3"><button type="submit" className={`btn w-100 fw-bold ${isEditingClient ? 'btn-warning' : 'btn-dark'}`}>{isEditingClient ? 'Update' : 'Create'}</button></div>{isEditingClient && <div className="col-12 text-end"><button type="button" onClick={() => { setIsEditingClient(false); setClientForm({id:null, name:"", mobile:""}) }} className="btn btn-link btn-sm text-muted">Cancel Edit</button></div>}</form><h6 className="fw-bold text-muted mb-3">Existing Clients</h6><div className="table-responsive" style={{maxHeight: '300px', overflowY: 'auto'}}><table className="table table-sm table-hover align-middle"><thead className="table-light sticky-top"><tr><th>Name</th><th>Mobile</th><th className="text-end">Actions</th></tr></thead><tbody>{data.clients.map(cli => (<tr key={cli.id}><td className="fw-bold">{cli.name}</td><td className="text-muted">{cli.mobile || '-'}</td><td className="text-end"><button onClick={() => handleEditClientClick(cli)} className="btn btn-sm btn-link text-primary me-2"><i className="bi bi-pencil-square"></i></button><button onClick={() => handleDeleteClient(cli.id)} className="btn btn-sm btn-link text-danger"><i className="bi bi-trash"></i></button></td></tr>))}</tbody></table></div></div></div></div></div>)}

        </div>
    );
}
