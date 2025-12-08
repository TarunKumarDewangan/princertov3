import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';
import { useNavigate, Link } from 'react-router-dom';

export default function WorkBook() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [sendingMsgId, setSendingMsgId] = useState(false);

    // View Mode & Data
    const [viewMode, setViewMode] = useState('daily');
    const [data, setData] = useState({
        clients: [], jobs: [],
        stats: { all: { bill: 0, paid: 0, due: 0 }, daily: { bill: 0, paid: 0, due: 0 } }
    });

    // Filters & Modals
    const [searchTerm, setSearchTerm] = useState(""); // Local search for clients
    const [showModal, setShowModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);

    // Forms
    const [clientForm, setClientForm] = useState({ id: null, name: "", mobile: "" });
    const [isEditingClient, setIsEditingClient] = useState(false);
    const [form, setForm] = useState({ client_id: "", job_date: new Date().toISOString().slice(0, 16), vehicle_no: "", description: "", bill_amount: "", paid_amount: "" });

    // Payment Modal State
    const [payClient, setPayClient] = useState("");
    const [payAmount, setPayAmount] = useState("");
    const [pendingList, setPendingList] = useState([]);
    const [totalDue, setTotalDue] = useState(0);

    useEffect(() => { fetchJobs(); }, []);

    // Stats Toggle
    const currentStats = viewMode === 'daily' ? data.stats.daily : data.stats.all;

    // --- FETCH DATA ---
    const fetchJobs = async () => {
        setLoading(true);
        try {
            // We fetch everything. The controller now returns Clients WITH Balances.
            const res = await api.get(`/api/work-jobs`);
            setData(res.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    // --- CLIENT LIST FILTERING ---
    const filteredClients = data.clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.mobile && client.mobile.includes(searchTerm))
    );

    const handleRowClick = (clientId) => {
        navigate(`/work-book/client/${clientId}`);
    };

    const handleSendReminder = async (e, clientId) => {
        e.stopPropagation();
        if(!clientId) return;
        if(!confirm("Send WhatsApp dues reminder?")) return;
        setSendingMsgId(true);
        try { await api.post('/api/work-jobs/send-reminder', { client_id: clientId }); toast.success("Sent!"); }
        catch (error) { toast.error("Failed"); } finally { setSendingMsgId(false); }
    };

    // --- FORM HANDLERS ---
    useEffect(() => { if (payClient) { const fetchDues = async () => { try { const res = await api.get(`/api/work-jobs/dues/${payClient}`); setPendingList(res.data.jobs); setTotalDue(res.data.total_due); } catch (e) {} }; fetchDues(); } else { setPendingList([]); setTotalDue(0); } }, [payClient]);
    const handlePaymentSubmit = async (e) => { e.preventDefault(); if (!payClient || !payAmount) return toast.error("Invalid"); try { await api.post('/api/work-jobs/pay', { client_id: payClient, amount: payAmount }); toast.success("Received!"); setShowPayModal(false); setPayClient(""); setPayAmount(""); fetchJobs(); } catch (error) { toast.error("Failed"); } };
    const handleSubmit = async (e) => { e.preventDefault(); if (!form.client_id) return toast.error("Select Client"); try { await api.post('/api/work-jobs', form); toast.success("Added!"); setShowModal(false); setForm({ client_id: "", job_date: new Date().toISOString().slice(0, 16), vehicle_no: "", description: "", bill_amount: "", paid_amount: "" }); fetchJobs(); } catch (error) { toast.error("Failed"); } };
    const handleSaveClient = async (e) => { e.preventDefault(); try { if (isEditingClient) { await api.put(`/api/clients/${clientForm.id}`, { name: clientForm.name.toUpperCase(), mobile: clientForm.mobile }); toast.success("Updated"); } else { await api.post('/api/clients', { name: clientForm.name.toUpperCase(), mobile: clientForm.mobile }); toast.success("Created"); } setClientForm({ id: null, name: "", mobile: "" }); setIsEditingClient(false); fetchJobs(); } catch (e) { toast.error("Failed"); } };
    const handleEditClientClick = (c) => { setClientForm({ id: c.id, name: c.name, mobile: c.mobile || "" }); setIsEditingClient(true); };
    const handleDeleteClient = async (id) => { if(!confirm("Delete Client?")) return; try { await api.delete(`/api/clients/${id}`); toast.success("Deleted"); setClientForm({ id: null, name: "", mobile: "" }); setIsEditingClient(false); fetchJobs(); } catch (e) { toast.error("Failed"); } };

    return (
        <div className="bg-light min-vh-100">
            <div className="d-print-none"><UserNavbar /></div>

            <div className="container mt-4 pb-5">

                {/* 1. STATS */}
                <div className="row g-3 mb-4 d-print-none">
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-5 border-primary">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                                <small className="text-muted fw-bold">TOTAL WORK</small>
                                <div className="btn-group btn-group-sm"><button type="button" className={`btn ${viewMode === 'daily' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('daily')}>Today</button><button type="button" className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('all')}>All</button></div>
                            </div>
                            <h3 className="fw-bold text-primary mb-0">₹{Number(currentStats.bill).toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="col-6 col-md-4"><div className="card border-0 shadow-sm p-3 bg-success-subtle h-100"><small className="text-success fw-bold">RECEIVED</small><h3 className="fw-bold text-success mb-0">₹{Number(currentStats.paid).toLocaleString()}</h3></div></div>
                    <div className="col-6 col-md-4"><div className="card border-0 shadow-sm p-3 bg-warning-subtle h-100"><small className="text-dark fw-bold">PENDING DUES</small><h3 className="fw-bold text-dark mb-0">₹{Number(currentStats.due).toLocaleString()}</h3></div></div>
                </div>

                {/* 2. ACTION & FILTER */}
                <div className="card border-0 shadow-sm mb-4 d-print-none">
                    <div className="card-body p-4 d-flex flex-column flex-md-row gap-3 justify-content-between align-items-center">
                        <div className="d-flex gap-2">
                            <button onClick={() => { setClientForm({id:null, name:"", mobile:""}); setIsEditingClient(false); setShowClientModal(true); }} className="btn btn-outline-dark fw-bold"><i className="bi bi-person-gear me-2"></i> Clients</button>
                            <button onClick={() => setShowPayModal(true)} className="btn btn-success fw-bold"><i className="bi bi-cash-coin me-2"></i> Receive</button>
                            <button onClick={() => setShowModal(true)} className="btn btn-primary fw-bold"><i className="bi bi-plus-lg me-2"></i> Add Work</button>
                        </div>
                        <div className="w-100 w-md-50">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search Client Name / Mobile..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. CLIENT LIST (ALWAYS SHOWS ALL CLIENTS) */}
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white py-3 fw-bold">Client List ({filteredClients.length})</div>
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">Client Name</th>
                                    <th>Mobile</th>
                                    <th className="text-end">Last Work</th>
                                    <th className="text-end text-danger pe-4">Due Balance</th>
                                    <th className="text-center d-print-none">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (<tr><td colSpan="5" className="text-center py-5">Loading...</td></tr>) :
                                filteredClients.length > 0 ? (filteredClients.map((client) => {
                                    const due = client.total_bill - client.total_paid;
                                    return (
                                        <tr key={client.id} onClick={() => handleRowClick(client.id)} style={{cursor: 'pointer'}}>
                                            <td className="ps-4 fw-bold text-primary">{client.name} <i className="bi bi-chevron-right small text-muted ms-1"></i></td>
                                            <td className="text-muted">{client.mobile || '-'}</td>
                                            <td className="text-end small text-muted">{client.last_work_date ? new Date(client.last_work_date).toLocaleDateString('en-GB') : '-'}</td>
                                            <td className={`text-end fw-bold pe-4 ${due > 0 ? 'text-danger' : 'text-success'}`}>₹{Number(due).toLocaleString()}</td>
                                            <td className="text-center d-print-none">
                                                {due > 0 && <button onClick={(e) => handleSendReminder(e, client.id)} className="btn btn-sm btn-outline-success border-0" disabled={sendingMsgId}><i className="bi bi-whatsapp"></i></button>}
                                            </td>
                                        </tr>
                                    );
                                })) : (<tr><td colSpan="5" className="text-center py-5 text-muted">No clients found. Add a client first.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALS (Standard) */}
            {showPayModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header bg-success text-white"><h5 className="modal-title fw-bold">Receive Payment</h5><button className="btn-close btn-close-white" onClick={() => setShowPayModal(false)}></button></div><div className="modal-body p-4"><div className="mb-3"><label className="form-label small fw-bold text-muted">Select Client</label><select className="form-select fw-bold" value={payClient} onChange={e => setPayClient(e.target.value)}><option value="">-- Select --</option>{data.clients.map(cli => <option key={cli.id} value={cli.id}>{cli.name}</option>)}</select></div>{payClient && (<div className="alert alert-warning d-flex justify-content-between align-items-center mb-3"><span className="small">Total Pending Dues:</span><strong className="fs-5 text-danger">₹{Number(totalDue).toLocaleString()}</strong></div>)}<div className="mb-4"><label className="form-label small fw-bold text-muted">Amount Received (₹)</label><input type="number" className="form-control fs-4 fw-bold text-success" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} disabled={!payClient} /></div><div className="d-grid"><button onClick={handlePaymentSubmit} className="btn btn-success fw-bold py-2" disabled={!payClient || !payAmount}>Confirm Payment</button></div></div></div></div></div>)}

            {showModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header bg-primary text-white"><h5 className="modal-title fw-bold">Add New Work</h5><button className="btn-close btn-close-white" onClick={()=>setShowModal(false)}></button></div><form onSubmit={handleSubmit}><div className="modal-body p-4"><div className="row g-2 mb-3"><div className="col-6"><label className="form-label small fw-bold text-muted">Date</label><input type="datetime-local" className="form-control" value={form.job_date} onChange={e => setForm({...form, job_date: e.target.value})} required /></div><div className="col-6"><label className="form-label small fw-bold text-muted">Vehicle No (Opt)</label><input type="text" className="form-control" placeholder="CG04..." value={form.vehicle_no} onChange={e => setForm({...form, vehicle_no: e.target.value.toUpperCase()})} /></div></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Select Client</label><select className="form-select" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} required><option value="">Select...</option>{data.clients.map(cli => <option key={cli.id} value={cli.id}>{cli.name}</option>)}</select></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Work Description</label><input type="text" className="form-control" placeholder="e.g. TAX PAID" value={form.description} onChange={e => setForm({...form, description: e.target.value.toUpperCase()})} required /></div><div className="row g-2 mb-3"><div className="col-6"><label className="form-label small fw-bold text-muted">Bill Amount (₹)</label><input type="number" className="form-control fw-bold fs-5" placeholder="0" value={form.bill_amount} onChange={e => setForm({...form, bill_amount: e.target.value})} required /></div><div className="col-6"><label className="form-label small fw-bold text-muted">Received (₹)</label><input type="number" className="form-control fw-bold fs-5 text-success" placeholder="0" value={form.paid_amount} onChange={e => setForm({...form, paid_amount: e.target.value})} /></div></div></div><div className="modal-footer border-0 pt-0"><button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary fw-bold px-4">Save Work</button></div></form></div></div></div>)}

            {showClientModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content border-0 shadow-lg"><div className="modal-header"><h5 className="modal-title fw-bold">Manage Clients</h5><button className="btn-close" onClick={()=>setShowClientModal(false)}></button></div><div className="modal-body p-4"><form onSubmit={handleSaveClient} className="row g-2 align-items-end mb-4 border-bottom pb-4"><div className="col-md-5"><label className="form-label fw-bold small">Client Name *</label><input type="text" className="form-control" placeholder="RAVI KUMAR" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value.toUpperCase()})} required /></div><div className="col-md-4"><label className="form-label fw-bold small">Mobile</label><input type="number" className="form-control" placeholder="10-digit" value={clientForm.mobile} onChange={e => setClientForm({...clientForm, mobile: e.target.value})} /></div><div className="col-md-3"><button type="submit" className={`btn w-100 fw-bold ${isEditingClient ? 'btn-warning' : 'btn-dark'}`}>{isEditingClient ? 'Update' : 'Create'}</button></div>{isEditingClient && <div className="col-12 text-end"><button type="button" onClick={() => { setIsEditingClient(false); setClientForm({id:null, name:"", mobile:""}) }} className="btn btn-link btn-sm text-muted">Cancel Edit</button></div>}</form><h6 className="fw-bold text-muted mb-3">Existing Clients</h6><div className="table-responsive" style={{maxHeight: '300px', overflowY: 'auto'}}><table className="table table-sm table-hover align-middle"><thead className="table-light sticky-top"><tr><th>Name</th><th>Mobile</th><th className="text-end">Actions</th></tr></thead><tbody>{data.clients.map(cli => (<tr key={cli.id}><td className="fw-bold">{cli.name}</td><td className="text-muted">{cli.mobile || '-'}</td><td className="text-end"><button onClick={() => handleEditClientClick(cli)} className="btn btn-sm btn-link text-primary me-2"><i className="bi bi-pencil-square"></i></button><button onClick={() => handleDeleteClient(cli.id)} className="btn btn-sm btn-link text-danger"><i className="bi bi-trash"></i></button></td></tr>))}</tbody></table></div></div></div></div></div>)}

        </div>
    );
}
