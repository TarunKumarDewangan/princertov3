import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';

export default function CashFlow() {
    const [loading, setLoading] = useState(true);
    const [sendingMsgId, setSendingMsgId] = useState(null); // Track which button is loading

    // Main Data
    const [data, setData] = useState({ accounts: [], entries: [], balance: 0, total_in: 0, total_out: 0 });

    // Filters
    const [filters, setFilters] = useState({ account_id: "", from_date: "", to_date: "", keyword: "" });
    const [isFiltered, setIsFiltered] = useState(false);

    // Modals
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [showWorkModal, setShowWorkModal] = useState(false);

    // Forms
    const [accountName, setAccountName] = useState("");
    const [accountMobile, setAccountMobile] = useState("");
    const [txnType, setTxnType] = useState("IN");
    const [entryForm, setEntryForm] = useState({ ledger_account_id: "", amount: "", entry_date: new Date().toISOString().split('T')[0], description: "" });
    const [workForm, setWorkForm] = useState({ ledger_account_id: "", work_done: "", cost: "", entry_date: new Date().toISOString().split('T')[0] });

    useEffect(() => { fetchLedger(); }, []);

    const fetchLedger = async () => {
        try {
            const res = await api.get('/api/ledger');
            setData(res.data);
            setLoading(false);
        } catch (error) { console.error(error); }
    };

    const handleSearch = async (e) => {
        if(e) e.preventDefault();
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if(filters.account_id) params.append('account_id', filters.account_id);
            if(filters.from_date) params.append('from_date', filters.from_date);
            if(filters.to_date) params.append('to_date', filters.to_date);
            if(filters.keyword) params.append('keyword', filters.keyword);

            const res = await api.get(`/api/ledger/search?${params.toString()}`);
            setData(prev => ({ ...prev, entries: res.data.entries, balance: res.data.balance, total_in: res.data.total_in, total_out: res.data.total_out }));
            setIsFiltered(true);
        } catch (error) { toast.error("Search Failed"); } finally { setLoading(false); }
    };

    // --- SEND REMINDER ---
    const handleSendReminder = async (accountId) => {
        if(!accountId) return;
        if(!confirm("Send WhatsApp balance reminder?")) return;

        setSendingMsgId(accountId);
        try {
            await api.post('/api/ledger/send-reminder', { account_id: accountId });
            toast.success("Reminder Sent Successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send");
        } finally {
            setSendingMsgId(null);
        }
    };

    const clearFilters = () => {
        setFilters({ account_id: "", from_date: "", to_date: "", keyword: "" });
        setIsFiltered(false);
        fetchLedger();
    };

    const handlePrint = () => { window.print(); };

    // --- FORM SUBMISSIONS ---
    const handleCreateAccount = async (e) => { e.preventDefault(); try { await api.post('/api/ledger/account', { name: accountName.toUpperCase(), mobile: accountMobile }); toast.success("Account Created"); setAccountName(""); setAccountMobile(""); setShowAccountModal(false); fetchLedger(); } catch (error) { toast.error("Failed"); } };
    const handleEntry = async (e) => { e.preventDefault(); if(!entryForm.ledger_account_id) return toast.error("Select Account"); try { await api.post('/api/ledger/entry', { ...entryForm, description: entryForm.description.toUpperCase(), txn_type: txnType }); toast.success("Saved!"); setEntryForm({ ledger_account_id: "", amount: "", entry_date: new Date().toISOString().split('T')[0], description: "" }); setShowEntryModal(false); fetchLedger(); } catch (error) { toast.error("Failed"); } };
    const handleWorkEntry = async (e) => { e.preventDefault(); if(!workForm.ledger_account_id) return toast.error("Select Account"); try { await api.post('/api/ledger/entry', { ledger_account_id: workForm.ledger_account_id, amount: workForm.cost, entry_date: workForm.entry_date, txn_type: 'OUT', description: `WORK: ${workForm.work_done.toUpperCase()}` }); toast.success("Work Recorded!"); setWorkForm({ ledger_account_id: "", work_done: "", cost: "", entry_date: new Date().toISOString().split('T')[0] }); setShowWorkModal(false); fetchLedger(); } catch (error) { toast.error("Failed"); } };

    return (
        <div className="bg-light min-vh-100">
            <div className="d-print-none"><UserNavbar /></div>

            {/* PRINT HEADER */}
            <div className="d-none d-print-block text-center mb-4 pt-4">
                <h2 className="fw-bold">Prince RTO - Ledger Report</h2>
                <p>Generated: {new Date().toLocaleDateString()} | {filters.account_id ? "Filtered View" : "All Accounts"}</p>
            </div>

            <div className="container mt-4 pb-5">

                {/* 1. STATS ROW */}
                <div className="row g-3 mb-4 d-print-none">
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-5 border-primary position-relative">
                            <small className="text-muted fw-bold">NET BALANCE {filters.account_id ? "(Selected Account)" : "(Total)"}</small>
                            <h2 className={`fw-bold mb-0 ${data.balance >= 0 ? 'text-primary' : 'text-danger'}`}>
                                {data.balance >= 0 ? 'Cr ' : 'Dr '} ₹{Number(Math.abs(data.balance)).toLocaleString()}
                            </h2>

                            {/* BIG REMINDER BUTTON (Visible only when filtering by specific user) */}
                            {filters.account_id && (
                                <button
                                    onClick={() => handleSendReminder(filters.account_id)}
                                    className="btn btn-sm btn-success position-absolute top-0 end-0 m-3 fw-bold"
                                    disabled={sendingMsgId === filters.account_id}
                                >
                                    {sendingMsgId === filters.account_id ? (
                                        <span><span className="spinner-border spinner-border-sm me-1"></span> Sending...</span>
                                    ) : (
                                        <span><i className="bi bi-whatsapp me-1"></i> Send Due</span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="col-6 col-md-4"><div className="card border-0 shadow-sm p-3 bg-success-subtle h-100"><div className="d-flex justify-content-between align-items-center"><div><small className="text-success fw-bold">TOTAL IN (CREDIT)</small><h4 className="fw-bold mb-0 text-success">₹{Number(data.total_in).toLocaleString()}</h4></div><i className="bi bi-arrow-down-circle-fill fs-1 text-success opacity-50"></i></div></div></div>
                    <div className="col-6 col-md-4"><div className="card border-0 shadow-sm p-3 bg-danger-subtle h-100"><div className="d-flex justify-content-between align-items-center"><div><small className="text-danger fw-bold">TOTAL OUT (DEBIT)</small><h4 className="fw-bold mb-0 text-danger">₹{Number(data.total_out).toLocaleString()}</h4></div><i className="bi bi-arrow-up-circle-fill fs-1 text-danger opacity-50"></i></div></div></div>
                </div>

                {/* 2. ACTIONS AREA */}
                <div className="card border-0 shadow-sm mb-4 d-print-none">
                    <div className="card-body p-4">
                        <h5 className="fw-bold mb-3">Quick Actions</h5>
                        <div className="row g-3">
                            <div className="col-md-4"><button onClick={() => setShowAccountModal(true)} className="btn btn-outline-primary w-100 py-3 fw-bold border-2 shadow-sm"><i className="bi bi-folder-plus me-2"></i> Create Account Head</button></div>
                            <div className="col-md-4"><button onClick={() => setShowWorkModal(true)} className="btn btn-dark w-100 py-3 fw-bold shadow-sm"><i className="bi bi-briefcase-fill me-2"></i> Work Entry</button></div>
                            <div className="col-md-4"><button onClick={() => {setTxnType("IN"); setShowEntryModal(true);}} className="btn btn-primary w-100 py-3 fw-bold shadow-sm"><i className="bi bi-plus-circle-fill me-2"></i> Cash In / Out</button></div>
                        </div>
                    </div>
                </div>

                {/* 3. SEARCH & REPORT */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white py-3 fw-bold d-flex justify-content-between align-items-center d-print-none">
                        <span><i className="bi bi-filter-circle me-2"></i> Ledger Report & Filter</span>
                        <button onClick={handlePrint} className="btn btn-sm btn-secondary"><i className="bi bi-printer me-2"></i> Print View</button>
                    </div>

                    <div className="card-body bg-light d-print-none">
                        <form onSubmit={handleSearch} className="row g-2 align-items-end">
                            <div className="col-md-3">
                                <label className="small fw-bold text-muted">Filter by Account</label>
                                <select className="form-select form-select-sm" value={filters.account_id} onChange={e => setFilters({...filters, account_id: e.target.value})}>
                                    <option value="">-- All Accounts --</option>
                                    {data.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-2"><label className="small fw-bold text-muted">From</label><input type="date" className="form-control form-select-sm" value={filters.from_date} onChange={e => setFilters({...filters, from_date: e.target.value})} /></div>
                            <div className="col-md-2"><label className="small fw-bold text-muted">To</label><input type="date" className="form-control form-select-sm" value={filters.to_date} onChange={e => setFilters({...filters, to_date: e.target.value})} /></div>
                            <div className="col-md-3"><label className="small fw-bold text-muted">Keyword</label><input type="text" className="form-control form-select-sm" placeholder="Search description..." value={filters.keyword} onChange={e => setFilters({...filters, keyword: e.target.value})} /></div>
                            <div className="col-md-2 d-flex gap-1"><button type="submit" className="btn btn-sm btn-primary w-100 fw-bold">Search</button>{isFiltered && <button type="button" onClick={clearFilters} className="btn btn-sm btn-outline-danger"><i className="bi bi-x-lg"></i></button>}</div>
                        </form>
                    </div>
                </div>

                {/* 4. TABLE */}
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white py-3 fw-bold border-bottom d-print-none">
                        {isFiltered ? <span className="text-primary">Filtered Results ({data.entries.length})</span> : "Recent Transactions"}
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle table-bordered border-light" style={{fontSize: '0.95rem'}}>
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-3" style={{width: '15%'}}>Date</th>
                                    <th style={{width: '25%'}}>Account Details</th>
                                    <th>Description / Work</th>
                                    <th className="text-center" style={{width: '10%'}}>Type</th>
                                    <th className="text-end pe-3" style={{width: '15%'}}>Amount</th>
                                    <th className="text-center d-print-none" style={{width: '10%'}}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (<tr><td colSpan="6" className="text-center py-5">Loading...</td></tr>) : data.entries.length > 0 ? (data.entries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="ps-3">{new Date(entry.entry_date).toLocaleDateString('en-GB')}</td>
                                        <td>
                                            <div className="fw-bold text-dark">{entry.account_name}</div>
                                            {entry.account_mobile && <small className="text-muted d-block" style={{fontSize: '0.75rem'}}><i className="bi bi-phone"></i> {entry.account_mobile}</small>}
                                        </td>
                                        <td>
                                            {entry.description?.startsWith("WORK:")
                                                ? <span className="fw-bold text-dark">{entry.description}</span>
                                                : <span className="text-secondary">{entry.description || '-'}</span>
                                            }
                                        </td>
                                        <td className="text-center">
                                            {entry.txn_type === 'IN'
                                                ? <span className="badge bg-success-subtle text-success border border-success px-2 d-print-none">CREDIT</span>
                                                : <span className="badge bg-danger-subtle text-danger border border-danger px-2 d-print-none">DEBIT</span>
                                            }
                                            <span className="d-none d-print-inline fw-bold small">{entry.txn_type}</span>
                                        </td>
                                        <td className={`text-end pe-3 fw-bold ${entry.txn_type === 'IN' ? 'text-success' : 'text-danger'}`}>
                                            {entry.txn_type === 'IN' ? '+' : '-'} ₹{Number(entry.amount).toLocaleString()}
                                        </td>
                                        <td className="text-center d-print-none">
                                            {/* WhatsApp Button Per Row */}
                                            <button
                                                onClick={() => handleSendReminder(entry.ledger_account_id)}
                                                className="btn btn-sm btn-outline-success border-0"
                                                title="Send Balance Reminder"
                                                disabled={sendingMsgId === entry.ledger_account_id}
                                            >
                                                {sendingMsgId === entry.ledger_account_id ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-whatsapp fs-5"></i>}
                                            </button>
                                        </td>
                                    </tr>
                                ))) : (<tr><td colSpan="6" className="text-center py-5 text-muted">No records found.</td></tr>)}
                            </tbody>
                            <tfoot className="table-light fw-bold">
                                <tr>
                                    <td colSpan="4" className="text-end">NET TOTALS:</td>
                                    <td className={`text-end pe-3 fs-5 ${data.balance >= 0 ? 'text-primary' : 'text-danger'}`}>
                                        {data.balance >= 0 ? 'Cr ' : 'Dr '} ₹{Number(Math.abs(data.balance)).toLocaleString()}
                                    </td>
                                    <td className="d-print-none"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALS (Identical to before) */}
            {showAccountModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header"><h5 className="modal-title fw-bold">Create Ledger Account</h5><button className="btn-close" onClick={()=>setShowAccountModal(false)}></button></div><form onSubmit={handleCreateAccount}><div className="modal-body p-4"><div className="mb-3"><label className="form-label fw-bold small">Account Name *</label><input type="text" className="form-control" placeholder="NAME" value={accountName} onChange={e => setAccountName(e.target.value.toUpperCase())} required autoFocus /></div><div className="mb-3"><label className="form-label fw-bold small">Mobile (Optional)</label><input type="number" className="form-control" value={accountMobile} onChange={e => setAccountMobile(e.target.value)} /></div></div><div className="modal-footer border-0 pt-0"><button type="button" className="btn btn-secondary" onClick={()=>setShowAccountModal(false)}>Cancel</button><button type="submit" className="btn btn-primary fw-bold px-4">Create</button></div></form></div></div></div>)}
            {showWorkModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header bg-dark text-white"><h5 className="modal-title fw-bold">Work Entry</h5><button className="btn-close btn-close-white" onClick={()=>setShowWorkModal(false)}></button></div><form onSubmit={handleWorkEntry}><div className="modal-body p-4"><div className="mb-3"><label className="form-label small fw-bold text-muted">Date</label><input type="date" className="form-control" value={workForm.entry_date} onChange={e => setWorkForm({...workForm, entry_date: e.target.value})} required /></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Select Account</label><select className="form-select" value={workForm.ledger_account_id} onChange={e => setWorkForm({...workForm, ledger_account_id: e.target.value})} required><option value="">Choose...</option>{data.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Work Done</label><textarea className="form-control fw-bold" rows="2" placeholder="DETAILS..." value={workForm.work_done} onChange={e => setWorkForm({...workForm, work_done: e.target.value.toUpperCase()})} required /></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Cost (₹)</label><input type="number" className="form-control fw-bold fs-5 text-danger" placeholder="0" value={workForm.cost} onChange={e => setWorkForm({...workForm, cost: e.target.value})} required /></div></div><div className="modal-footer border-0 pt-0"><button type="button" className="btn btn-secondary" onClick={()=>setShowWorkModal(false)}>Cancel</button><button type="submit" className="btn btn-dark fw-bold px-4">Save Work</button></div></form></div></div></div>)}
            {showEntryModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header border-bottom-0 pb-0"><h5 className="modal-title fw-bold">Cash Transaction</h5><button className="btn-close" onClick={()=>setShowEntryModal(false)}></button></div><div className="modal-body p-4"><form onSubmit={handleEntry}><div className="d-flex gap-2 mb-4 p-1 bg-light rounded-pill border"><button type="button" className={`btn w-50 rounded-pill fw-bold ${txnType === 'IN' ? 'btn-success shadow-sm' : 'text-muted'}`} onClick={() => setTxnType("IN")}>CASH IN</button><button type="button" className={`btn w-50 rounded-pill fw-bold ${txnType === 'OUT' ? 'btn-danger shadow-sm' : 'text-muted'}`} onClick={() => setTxnType("OUT")}>CASH OUT</button></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Select Account</label><select className="form-select" value={entryForm.ledger_account_id} onChange={e => setEntryForm({...entryForm, ledger_account_id: e.target.value})} required><option value="">Choose...</option>{data.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} {acc.mobile ? `(${acc.mobile})` : ''}</option>)}</select></div><div className="row mb-3"><div className="col-6"><label className="form-label small fw-bold text-muted">Amount (₹)</label><input type="number" className="form-control fw-bold fs-5" placeholder="0" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} required /></div><div className="col-6"><label className="form-label small fw-bold text-muted">Date</label><input type="date" className="form-control" value={entryForm.entry_date} onChange={e => setEntryForm({...entryForm, entry_date: e.target.value})} required /></div></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Description</label><input type="text" className="form-control" placeholder="NOTES..." value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value.toUpperCase()})} /></div><div className="d-grid mt-4"><button type="submit" className={`btn py-2 fw-bold ${txnType === 'IN' ? 'btn-success' : 'btn-danger'}`}>{txnType === 'IN' ? 'Receive Payment' : 'Record Expense'}</button></div></form></div></div></div></div>)}

        </div>
    );
}


