import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';
import { useNavigate } from 'react-router-dom';

export default function WorkBook() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [sendingMsgId, setSendingMsgId] = useState(null);

    // --- FILTERS ---
    const [filterType, setFilterType] = useState('today'); // 'today', 'all', 'custom'
    const [selectedClient, setSelectedClient] = useState("");
    const [customDates, setCustomDates] = useState({
        from: new Date().toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10)
    });
    const [searchText, setSearchText] = useState("");

    // --- DATA ---
    const [data, setData] = useState({
        clients: [],
        jobs: []
    });

    // Modals
    const [showClientModal, setShowClientModal] = useState(false);
    const [clientForm, setClientForm] = useState({ id: null, name: "", mobile: "" });
    const [isEditingClient, setIsEditingClient] = useState(false);

    // --- 1. FETCH DATA ---
    useEffect(() => {
        fetchData();
    }, [filterType, selectedClient, customDates.from, customDates.to]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();

            // Client Filter
            if (selectedClient) params.append('client_id', selectedClient);

            // Date Filter
            if (filterType === 'today') {
                const today = new Date().toISOString().slice(0, 10);
                params.append('from_date', today);
                params.append('to_date', today);
            } else if (filterType === 'custom') {
                params.append('from_date', customDates.from);
                params.append('to_date', customDates.to);
            }

            const res = await api.get(`/api/work-jobs?${params.toString()}`);
            setData(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. GROUP DATA & CALCULATE STATS (Frontend Logic) ---
    const tableData = useMemo(() => {
        if (!data.jobs) return [];

        const grouped = data.jobs.reduce((acc, job) => {
            // Text Search Filter
            if (searchText && !job.client_name.toLowerCase().includes(searchText.toLowerCase())) {
                return acc;
            }

            if (!acc[job.client_id]) {
                // Find client details safely
                const clientInfo = data.clients.find(c => c.id === job.client_id) || {};

                acc[job.client_id] = {
                    id: job.client_id,
                    name: job.client_name || clientInfo.name || 'Unknown', // Fallback name
                    mobile: job.mobile || clientInfo.mobile || '-',
                    last_work: job.job_date,
                    bill: 0,
                    paid: 0
                };
            }

            acc[job.client_id].bill += Number(job.bill_amount);
            acc[job.client_id].paid += Number(job.paid_amount);

            // Keep latest date
            if (new Date(job.job_date) > new Date(acc[job.client_id].last_work)) {
                acc[job.client_id].last_work = job.job_date;
            }
            return acc;
        }, {});

        return Object.values(grouped);
    }, [data, searchText]);

    // Calculate Top Stats based on Table Data
    const currentStats = useMemo(() => {
        return tableData.reduce((acc, row) => {
            acc.bill += row.bill;
            acc.paid += row.paid;
            acc.balance += (row.bill - row.paid);
            return acc;
        }, { bill: 0, paid: 0, balance: 0 });
    }, [tableData]);

    // --- HANDLERS ---
    const handleRowClick = (id) => navigate(`/work-book/client/${id}`);

    const handleSendReminder = async (e, clientId) => {
        e.stopPropagation();
        if(!clientId) return;
        if(!confirm("Send WhatsApp Balance Reminder?")) return;

        setSendingMsgId(clientId);
        try {
            await api.post('/api/work-jobs/send-reminder', { client_id: clientId });
            toast.success("Reminder Sent!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send");
        } finally {
            setSendingMsgId(null);
        }
    };

    // Client CRUD
    const handleSaveClient = async (e) => { e.preventDefault(); try { if (isEditingClient) await api.put(`/api/clients/${clientForm.id}`, { name: clientForm.name.toUpperCase(), mobile: clientForm.mobile }); else await api.post('/api/clients', { name: clientForm.name.toUpperCase(), mobile: clientForm.mobile }); toast.success("Success"); setClientForm({ id: null, name: "", mobile: "" }); setIsEditingClient(false); fetchData(); } catch (e) { toast.error("Failed"); } };
    const handleEditClientClick = (c) => { setClientForm({ id: c.id, name: c.name, mobile: c.mobile || "" }); setIsEditingClient(true); };
    const handleDeleteClient = async (id) => { if(!confirm("Delete Client?")) return; try { await api.delete(`/api/clients/${id}`); toast.success("Deleted"); fetchData(); } catch (e) { toast.error("Failed"); } };

    return (
        <div className="bg-light min-vh-100">
            <div className="d-print-none"><UserNavbar /></div>

            <div className="container mt-4 pb-5">

                {/* 1. DYNAMIC STATS */}
                <div className="row g-3 mb-4 d-print-none">
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-5 border-primary">
                            <small className="text-muted fw-bold text-uppercase">Total Work ({filterType})</small>
                            <h3 className="fw-bold text-primary mb-0">₹{currentStats.bill.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="col-6 col-md-4">
                        <div className="card border-0 shadow-sm p-3 bg-success-subtle h-100">
                            <small className="text-success fw-bold text-uppercase">Received ({filterType})</small>
                            <h3 className="fw-bold text-success mb-0">₹{currentStats.paid.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="col-6 col-md-4">
                        <div className="card border-0 shadow-sm p-3 bg-warning-subtle h-100">
                            <small className="text-dark fw-bold text-uppercase">Balance Change</small>
                            <h3 className="fw-bold text-dark mb-0">₹{currentStats.balance.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                {/* 2. FILTER TOOLBAR */}
                <div className="card border-0 shadow-sm mb-4 d-print-none">
                    <div className="card-body p-3">
                        <div className="row g-3 align-items-end">
                            {/* Client Select */}
                            <div className="col-md-3">
                                <label className="small fw-bold text-muted">Select Client</label>
                                <select className="form-select form-select-sm" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                                    <option value="">-- All Clients --</option>
                                    {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Time Period Buttons */}
                            <div className="col-md-4">
                                <label className="small fw-bold text-muted d-block">Time Period</label>
                                <div className="btn-group btn-group-sm w-100">
                                    <button className={`btn ${filterType==='today'?'btn-dark':'btn-outline-secondary'}`} onClick={()=>setFilterType('today')}>Today</button>
                                    <button className={`btn ${filterType==='all'?'btn-dark':'btn-outline-secondary'}`} onClick={()=>setFilterType('all')}>All Time</button>
                                    <button className={`btn ${filterType==='custom'?'btn-dark':'btn-outline-secondary'}`} onClick={()=>setFilterType('custom')}>Custom</button>
                                </div>
                            </div>

                            {/* Custom Date Inputs */}
                            {filterType === 'custom' && (
                                <>
                                    <div className="col-6 col-md-2">
                                        <label className="small fw-bold text-muted">From</label>
                                        <input type="date" className="form-control form-select-sm" value={customDates.from} onChange={e=>setCustomDates({...customDates, from:e.target.value})} />
                                    </div>
                                    <div className="col-6 col-md-2">
                                        <label className="small fw-bold text-muted">To</label>
                                        <input type="date" className="form-control form-select-sm" value={customDates.to} onChange={e=>setCustomDates({...customDates, to:e.target.value})} />
                                    </div>
                                </>
                            )}

                            {/* Search */}
                             <div className={`col-md-${filterType === 'custom' ? '12' : '4'}`}>
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                                    <input type="text" className="form-control" placeholder="Search Name..." value={searchText} onChange={e => setSearchText(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. TABLE */}
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                        <span className="fw-bold">Client Activity ({tableData.length})</span>
                        <div className="d-flex gap-2">
                             <button onClick={() => { setClientForm({id:null, name:"", mobile:""}); setIsEditingClient(false); setShowClientModal(true); }} className="btn btn-outline-dark btn-sm fw-bold">
                                <i className="bi bi-person-gear"></i> Manage Clients
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary btn-sm"><i className="bi bi-printer"></i></button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">Client Name</th>
                                    <th>Mobile</th>
                                    <th>Last Activity</th>
                                    <th className="text-end text-primary">Work ({filterType})</th>
                                    <th className="text-end text-success">Recv ({filterType})</th>
                                    <th className="text-end text-dark pe-4">Total Due</th>
                                    <th className="text-center d-print-none">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (<tr><td colSpan="7" className="text-center py-5">Loading...</td></tr>) :
                                tableData.length > 0 ? (tableData.map((row) => {
                                    // Find LIFETIME Due from the main client object
                                    const fullClient = data.clients.find(c => c.id === row.id) || {};
                                    // Handle missing calculation if API didn't return sums for client
                                    // Fallback: If filter is ALL, use row data, else use what's available
                                    const totalDue = (fullClient.total_bill !== undefined)
                                        ? (fullClient.total_bill - fullClient.total_paid)
                                        : (row.bill - row.paid); // Fallback for safety

                                    return (
                                        <tr key={row.id} onClick={() => handleRowClick(row.id)} style={{cursor: 'pointer'}}>
                                            <td className="ps-4 fw-bold text-dark">
                                                {row.name} <i className="bi bi-chevron-right small text-muted ms-1"></i>
                                            </td>
                                            <td className="text-muted small">{row.mobile}</td>
                                            <td className="small text-muted">{new Date(row.last_work).toLocaleDateString('en-GB')}</td>
                                            <td className="text-end fw-bold text-primary">₹{row.bill.toLocaleString()}</td>
                                            <td className="text-end fw-bold text-success">₹{row.paid.toLocaleString()}</td>
                                            <td className="text-end fw-bold text-dark pe-4">₹{totalDue.toLocaleString()}</td>

                                            <td className="d-print-none text-center">
                                                <button
                                                    onClick={(e) => handleSendReminder(e, row.id)}
                                                    className="btn btn-sm btn-outline-success border-0"
                                                    title="Send WhatsApp"
                                                    disabled={sendingMsgId === row.id}
                                                >
                                                    {sendingMsgId === row.id ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-whatsapp"></i>}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })) : (<tr><td colSpan="7" className="text-center py-5 text-muted">No activity found for this period.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MANAGE CLIENTS MODAL --- */}
            {showClientModal && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header">
                                <h5 className="modal-title fw-bold">Manage Clients</h5>
                                <button className="btn-close" onClick={()=>setShowClientModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <form onSubmit={handleSaveClient} className="row g-2 align-items-end mb-4 border-bottom pb-4"><div className="col-md-5"><label className="form-label fw-bold small">Client Name *</label><input type="text" className="form-control" placeholder="RAVI KUMAR" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value.toUpperCase()})} required /></div><div className="col-md-4"><label className="form-label fw-bold small">Mobile</label><input type="number" className="form-control" placeholder="10-digit" value={clientForm.mobile} onChange={e => setClientForm({...clientForm, mobile: e.target.value})} /></div><div className="col-md-3"><button type="submit" className={`btn w-100 fw-bold ${isEditingClient ? 'btn-warning' : 'btn-dark'}`}>{isEditingClient ? 'Update' : 'Create'}</button></div>{isEditingClient && <div className="col-12 text-end"><button type="button" onClick={() => { setIsEditingClient(false); setClientForm({id:null, name:"", mobile:""}) }} className="btn btn-link btn-sm text-muted">Cancel Edit</button></div>}</form>
                                <h6 className="fw-bold text-muted mb-3">All Clients</h6>
                                <div className="table-responsive" style={{maxHeight: '300px', overflowY: 'auto'}}><table className="table table-sm table-hover align-middle"><thead className="table-light sticky-top"><tr><th>Name</th><th>Mobile</th><th className="text-end">Actions</th></tr></thead><tbody>{data.clients.map(cli => (<tr key={cli.id}><td className="fw-bold">{cli.name}</td><td className="text-muted">{cli.mobile || '-'}</td><td className="text-end"><button onClick={() => handleEditClientClick(cli)} className="btn btn-sm btn-link text-primary me-2"><i className="bi bi-pencil-square"></i></button><button onClick={() => handleDeleteClient(cli.id)} className="btn btn-sm btn-link text-danger"><i className="bi bi-trash"></i></button></td></tr>))}</tbody></table></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
