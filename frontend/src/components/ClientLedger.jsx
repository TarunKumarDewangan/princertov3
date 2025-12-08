import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';

export default function ClientLedger() {
    const { id } = useParams();
    const bottomRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [sendingMsg, setSendingMsg] = useState(false);

    const [data, setData] = useState({
        client: {},
        history: [],
        summary: { total_bill: 0, total_paid: 0, balance: 0 }
    });

    // Filter State
    const [filter, setFilter] = useState('all');
    const [customDates, setCustomDates] = useState({ from: '', to: '' });

    // Modals & Forms
    const [editingItem, setEditingItem] = useState(null);
    const [showWorkModal, setShowWorkModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);

    // Forms
    const [workForm, setWorkForm] = useState({ job_date: "", vehicle_no: "", description: "", bill_amount: "", paid_amount: "" });
    const [payForm, setPayForm] = useState({ job_date: "", amount: "" });

    // --- HELPER: GET LOCAL TIME ---
    const getCurrentLocalTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    useEffect(() => { fetchData(); }, [id]);

    useEffect(() => {
        if (!loading && filter === 'all' && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [data, loading]);

    const fetchData = async () => {
        try {
            const res = await api.get(`/api/work-jobs/client/${id}`);
            setData(res.data);
            setLoading(false);
        } catch (error) { console.error(error); }
    };

    // --- PROCESS LIST ---
    let runningBalance = 0;
    const fullList = [];
    data.history.forEach((item) => {
        const bill = Number(item.bill_amount) || 0;
        const paid = Number(item.paid_amount) || 0;
        if (bill > 0) {
            runningBalance += bill;
            fullList.push({ ...item, type: 'bill', snapshot_balance: runningBalance, displayDate: item.job_date });
        }
        if (paid > 0) {
            runningBalance -= paid;
            fullList.push({ ...item, type: 'payment', snapshot_balance: runningBalance, displayDate: item.job_date });
        }
    });

    const getFilteredList = () => {
        if (filter === 'all') return fullList;
        if (filter === 'today') {
            const today = new Date().toDateString();
            return fullList.filter(item => new Date(item.displayDate).toDateString() === today);
        }
        if (filter === 'custom' && customDates.from && customDates.to) {
            const from = new Date(customDates.from).setHours(0,0,0,0);
            const to = new Date(customDates.to).setHours(23,59,59,999);
            return fullList.filter(item => { const d = new Date(item.displayDate).getTime(); return d >= from && d <= to; });
        }
        return fullList;
    };
    const displayList = getFilteredList();

    // --- HANDLERS ---

    // UPDATED: Show specific error message
    const handleSendReminder = async () => {
        if(!confirm("Send WhatsApp Balance Reminder?")) return;
        setSendingMsg(true);
        try {
            await api.post('/api/work-jobs/send-reminder', { client_id: id });
            toast.success("Reminder Sent Successfully!");
        }
        catch (error) {
            // Show the actual error from backend (e.g. "No mobile linked")
            const msg = error.response?.data?.message || "Failed to send";
            toast.error(msg);
        } finally {
            setSendingMsg(false);
        }
    };

    const openAddWork = () => { setEditingItem(null); setWorkForm({ job_date: getCurrentLocalTime(), vehicle_no: "", description: "", bill_amount: "", paid_amount: "" }); setShowWorkModal(true); };
    const openAddPay = () => { setEditingItem(null); setPayForm({ job_date: getCurrentLocalTime(), amount: "" }); setShowPayModal(true); };

    const openEdit = (item, type) => {
        setEditingItem(item);
        const d = new Date(item.job_date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        const dateStr = d.toISOString().slice(0, 16);

        if (type === 'bill') {
            setWorkForm({ job_date: dateStr, vehicle_no: item.vehicle_no || "", description: item.description || "", bill_amount: item.bill_amount, paid_amount: item.paid_amount });
            setShowWorkModal(true);
        } else {
            setPayForm({ job_date: dateStr, amount: item.paid_amount });
            setShowPayModal(true);
        }
    };

    const handleDelete = async (itemId) => { if(!confirm("Delete permanently?")) return; try { await api.delete(`/api/work-jobs/${itemId}`); toast.success("Deleted"); fetchData(); } catch(e){ toast.error("Failed"); } };

    const handleWorkSubmit = async (e) => {
        e.preventDefault();
        const finalDate = editingItem ? workForm.job_date : getCurrentLocalTime();
        const payload = { ...workForm, client_id: id, job_date: finalDate };
        try { if (editingItem) await api.put(`/api/work-jobs/${editingItem.id}`, payload); else await api.post('/api/work-jobs', payload); toast.success("Saved!"); setShowWorkModal(false); fetchData(); } catch(e){ toast.error("Failed"); }
    };

    const handlePaySubmit = async (e) => {
        e.preventDefault();
        const finalDate = editingItem ? payForm.job_date : getCurrentLocalTime();
        try {
            if (editingItem) await api.put(`/api/work-jobs/${editingItem.id}`, { job_date: finalDate, bill_amount: 0, paid_amount: payForm.amount, description: "PAYMENT RECEIVED", client_id: id });
            else await api.post('/api/work-jobs/pay', { client_id: id, amount: payForm.amount });
            toast.success("Saved!"); setShowPayModal(false); fetchData();
        } catch(e){ toast.error("Failed"); }
    };

    const formatTime = (iso) => new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: true});
    const formatDate = (iso) => new Date(iso).toDateString();

    return (
        <div className="bg-light min-vh-100 d-flex flex-column">
            <UserNavbar />

            <div className="bg-white shadow-sm border-bottom sticky-top" style={{top: '56px', zIndex: 100}}>
                <div className="container py-2 d-flex justify-content-between align-items-center" style={{maxWidth: '600px'}}>
                    <div className="d-flex align-items-center gap-2">
                        <Link to="/work-book" className="btn btn-light btn-sm rounded-circle"><i className="bi bi-arrow-left"></i></Link>
                        <div>
                            <h6 className="fw-bold mb-0 text-dark">{data.client.name}</h6>
                            <small className="text-muted" style={{fontSize: '11px'}}>{data.client.mobile || 'No Mobile'}</small>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <button onClick={handleSendReminder} className="btn btn-success btn-sm rounded-circle shadow-sm" disabled={sendingMsg} style={{width: '35px', height: '35px'}}>
                            {sendingMsg ? <span className="spinner-border spinner-border-sm" style={{fontSize:'10px'}}></span> : <i className="bi bi-whatsapp"></i>}
                        </button>
                        <div className="text-end lh-1">
                            <small className="text-muted fw-bold" style={{fontSize: '10px'}}>NET DUE</small>
                            <h4 className={`fw-bold mb-0 ${data.summary.balance > 0 ? 'text-danger' : 'text-success'}`}>₹{Number(data.summary.balance).toLocaleString()}</h4>
                        </div>
                    </div>
                </div>
                {/* FILTERS */}
                <div className="container pb-2" style={{maxWidth: '600px'}}>
                    <div className="d-flex justify-content-center gap-2">
                        <button className={`btn btn-sm rounded-pill px-3 ${filter === 'today' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setFilter('today')}>Today</button>
                        <button className={`btn btn-sm rounded-pill px-3 ${filter === 'all' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setFilter('all')}>All Time</button>
                        <button className={`btn btn-sm rounded-pill px-3 ${filter === 'custom' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setFilter('custom')}>Custom</button>
                    </div>
                    {filter === 'custom' && (
                        <div className="d-flex gap-2 mt-2 justify-content-center animate__animated animate__fadeInDown">
                            <input type="date" className="form-control form-control-sm w-auto" value={customDates.from} onChange={e => setCustomDates({...customDates, from: e.target.value})} />
                            <span className="align-self-center text-muted">-</span>
                            <input type="date" className="form-control form-control-sm w-auto" value={customDates.to} onChange={e => setCustomDates({...customDates, to: e.target.value})} />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow-1 bg-light pb-5">
                <div className="container pt-3" style={{maxWidth: '600px', paddingBottom: '120px'}}>
                    {displayList.length === 0 && <div className="text-center text-muted mt-5"><small>No transactions found.</small></div>}

                    {displayList.map((item, index) => {
                        const isNewDate = index === 0 || formatDate(item.displayDate) !== formatDate(displayList[index-1].displayDate);
                        return (
                            <React.Fragment key={`${item.id}-${item.type}-${index}`}>
                                {isNewDate && <div className="text-center my-4"><span className="badge bg-white text-secondary border shadow-sm px-3 py-1 rounded-pill fw-normal" style={{fontSize: '0.8rem'}}>{new Date(item.displayDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}</span></div>}

                                {item.type === 'payment' && (
                                    <div className="d-flex flex-column align-items-start mb-3 animate__animated animate__fadeInLeft">
                                        <div className="bg-white p-3 shadow-sm position-relative" style={{minWidth: '220px', maxWidth: '85%', borderLeft: '5px solid #198754', borderRadius: '0 12px 12px 12px', backgroundColor: '#f0fff4'}}>
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <h4 className="fw-bold text-success mb-0"><i className="bi bi-arrow-down"></i> ₹{Number(item.paid_amount).toLocaleString()}</h4>
                                                <small className="text-muted" style={{fontSize:'10px'}}>{formatTime(item.displayDate)}</small>
                                            </div>
                                            <div className="small text-secondary fw-bold">PAYMENT RECEIVED</div>
                                            <div className="mt-2 border-top pt-2 d-flex gap-3">
                                                <button onClick={() => openEdit(item, 'payment')} className="btn btn-link p-0 text-primary" style={{fontSize:'11px'}}>Edit</button>
                                                <button onClick={() => handleDelete(item.id)} className="btn btn-link p-0 text-danger" style={{fontSize:'11px'}}>Delete</button>
                                            </div>
                                        </div>
                                        <small className="text-muted ms-2 mt-1 fw-bold" style={{fontSize: '11px'}}>{item.snapshot_balance <= 0 ? "Clear" : `₹${Number(item.snapshot_balance).toLocaleString()} Due`}</small>
                                    </div>
                                )}

                                {item.type === 'bill' && (
                                    <div className="d-flex flex-column align-items-end mb-3 animate__animated animate__fadeInRight">
                                        <div className="bg-white p-3 shadow-sm position-relative" style={{minWidth: '240px', maxWidth: '85%', borderRight: '5px solid #dc3545', borderRadius: '12px 0 12px 12px', backgroundColor: '#fff5f5'}}>
                                            <div className="d-flex justify-content-between align-items-center mb-1 gap-4">
                                                <small className="text-muted" style={{fontSize:'10px'}}>{formatTime(item.displayDate)}</small>
                                                <h4 className="fw-bold text-danger mb-0">₹{Number(item.bill_amount).toLocaleString()} <i className="bi bi-arrow-up"></i></h4>
                                            </div>
                                            <div className="text-end mb-1">
                                                <div className="fw-bold text-dark">{item.description}</div>
                                                {item.vehicle_no && <span className="badge bg-light text-secondary border mt-1">{item.vehicle_no}</span>}
                                            </div>
                                            {Number(item.paid_amount) > 0 && <div className="text-end border-top pt-1 mt-1"><small className="text-success fw-bold" style={{fontSize:'11px'}}>+ ₹{Number(item.paid_amount).toLocaleString()} Advance</small></div>}
                                            <div className="mt-2 border-top pt-2 d-flex gap-3 justify-content-end">
                                                <button onClick={() => openEdit(item, 'bill')} className="btn btn-link p-0 text-primary" style={{fontSize:'11px'}}>Edit</button>
                                                <button onClick={() => handleDelete(item.id)} className="btn btn-link p-0 text-danger" style={{fontSize:'12px'}}>Delete</button>
                                            </div>
                                        </div>
                                        <small className="text-muted me-2 mt-1 fw-bold" style={{fontSize: '11px'}}>₹{Number(item.snapshot_balance).toLocaleString()} Due</small>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                    <div ref={bottomRef}></div>
                </div>
            </div>

            <div className="fixed-bottom bg-white shadow-lg border-top p-2" style={{zIndex: 101}}>
                <div className="container" style={{maxWidth: '600px'}}>
                    <div className="d-flex justify-content-between text-center mb-2 px-2 small text-secondary">
                        <span>Work: <strong>₹{Number(data.summary.total_bill).toLocaleString()}</strong></span>
                        <span>Recv: <strong>₹{Number(data.summary.total_paid).toLocaleString()}</strong></span>
                    </div>
                    <div className="d-flex gap-2">
                        <button onClick={openAddPay} className="btn btn-success fw-bold flex-grow-1 py-3 rounded-3"><i className="bi bi-arrow-down-left me-1"></i> RECEIVED (In)</button>
                        <button onClick={openAddWork} className="btn btn-danger fw-bold flex-grow-1 py-3 rounded-3"><i className="bi bi-arrow-up-right me-1"></i> WORK (Bill)</button>
                    </div>
                </div>
            </div>

            {showWorkModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.6)'}}><div className="modal-dialog modal-dialog-centered modal-sm"><div className="modal-content border-0 shadow-lg"><div className="modal-header bg-danger text-white py-2"><h6 className="modal-title fw-bold">{editingItem?'Edit Work':'Add Work Bill'}</h6><button className="btn-close btn-close-white" onClick={()=>setShowWorkModal(false)}></button></div><form onSubmit={handleWorkSubmit}><div className="modal-body p-3">{editingItem && <div className="mb-2"><label className="small fw-bold">Date & Time</label><input type="datetime-local" className="form-control" value={workForm.job_date} onChange={e=>setWorkForm({...workForm, job_date:e.target.value})} required /></div>}<input type="text" className="form-control mb-2" placeholder="Vehicle No (Opt)" value={workForm.vehicle_no} onChange={e=>setWorkForm({...workForm, vehicle_no:e.target.value.toUpperCase()})} /><textarea className="form-control mb-2 fw-bold" placeholder="Work Description..." rows="2" value={workForm.description} onChange={e=>setWorkForm({...workForm, description:e.target.value.toUpperCase()})} required></textarea><input type="number" className="form-control fw-bold text-danger fs-4 mb-3" placeholder="Bill Amount ₹" value={workForm.bill_amount} onChange={e=>setWorkForm({...workForm, bill_amount:e.target.value})} autoFocus required /><input type="number" className="form-control fw-bold text-success" placeholder="Advance Received ₹" value={workForm.paid_amount} onChange={e=>setWorkForm({...workForm, paid_amount:e.target.value})} /></div><div className="modal-footer p-2"><button type="submit" className="btn btn-danger w-100 fw-bold">{editingItem ? 'Update' : 'Save'}</button></div></form></div></div></div>)}
            {showPayModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.6)'}}><div className="modal-dialog modal-dialog-centered modal-sm"><div className="modal-content border-0 shadow-lg"><div className="modal-header bg-success text-white py-2"><h6 className="modal-title fw-bold">{editingItem?'Edit Payment':'Payment Received'}</h6><button className="btn-close btn-close-white" onClick={()=>setShowPayModal(false)}></button></div><div className="modal-body p-4 text-center">{editingItem && <div className="mb-3 text-start"><label className="small fw-bold text-muted">Date & Time</label><input type="datetime-local" className="form-control" value={payForm.job_date} onChange={e=>setPayForm({...payForm, job_date:e.target.value})} required /></div>}<p className="text-muted small mb-1">Amount</p><input type="number" className="form-control form-control-lg text-center fw-bold text-success fs-1 mb-3" placeholder="₹ 0" value={payForm.amount} onChange={e=>setPayForm({...payForm, amount:e.target.value})} autoFocus /><button onClick={handlePaySubmit} className="btn btn-success w-100 fw-bold py-2" disabled={!payForm.amount}>{editingItem ? 'Update' : 'Confirm'}</button></div></div></div></div>)}
        </div>
    );
}
