import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';

export default function CashFlow() {
    const [loading, setLoading] = useState(true);
    const [sendingMsgId, setSendingMsgId] = useState(null);

    // --- AUTH CHECK ---
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isLevel1 = user.role === 'level_1' || user.role === 'super_admin';

    // Main Data
    const [data, setData] = useState({
        accounts: [],
        entries: [],
        stats: {
            all: { in: 0, out: 0, balance: 0 },
            daily: { in: 0, out: 0, balance: 0 }
        }
    });

    // View Mode & Filters
    const [viewMode, setViewMode] = useState('daily');
    const [filters, setFilters] = useState({ account_id: "", from_date: "", to_date: "", keyword: "" });
    const [isFiltered, setIsFiltered] = useState(false);

    // Modals
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);

    // Forms
    const [accountForm, setAccountForm] = useState({ id: null, name: "", mobile: "" });
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [txnType, setTxnType] = useState("IN");

    // Helper to get local ISO string for input
    const getCurrentLocalTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    const [entryForm, setEntryForm] = useState({ ledger_account_id: "", amount: "", entry_date: getCurrentLocalTime(), description: "" });

    useEffect(() => { fetchLedger(); }, []);

    const fetchLedger = async () => {
        try {
            const res = await api.get('/api/ledger');
            setData(res.data);
            setLoading(false);
        } catch (error) { console.error(error); }
    };

    // --- STATS LOGIC ---
    const getStats = () => {
        if (isFiltered) {
            return {
                in: data.total_in, out: data.total_out,
                balance: data.balance // Filtered Balance
            };
        }
        return {
            in: viewMode === 'daily' ? data.stats.daily.in : data.stats.all.in,
            out: viewMode === 'daily' ? data.stats.daily.out : data.stats.all.out,
            balance: data.stats.all.balance // Always All Time
        };
    };
    const currentStats = getStats();

    // --- RUNNING BALANCE CALCULATION ---
    // We memoize this to avoid recalculating on every render
    const entriesWithBalance = useMemo(() => {
        if (loading || data.entries.length === 0) return [];

        // If filtered (Search), we can't accurately calculate running balance
        // because we might be missing the "previous" entries.
        // So we only do this for the main list (unfiltered).
        if (isFiltered) {
            return data.entries;
        }

        let currentRunningBalance = data.stats.all.balance; // Start with Global Balance

        // Map entries and calculate backwards
        return data.entries.map((entry) => {
            const entryWithBal = {
                ...entry,
                running_balance: currentRunningBalance
            };

            // Reverse the math for the next row (older row)
            if (entry.txn_type === 'IN') {
                // If money came IN, balance BEFORE this was Less
                currentRunningBalance = currentRunningBalance - Number(entry.amount);
            } else {
                // If money went OUT, balance BEFORE this was More
                currentRunningBalance = currentRunningBalance + Number(entry.amount);
            }

            return entryWithBal;
        });

    }, [data.entries, data.stats.all.balance, isFiltered, loading]);


    // Table Display Logic
    const getDisplayEntries = () => {
        const sourceData = entriesWithBalance; // Use our calculated list

        if (isFiltered) return sourceData;
        if (viewMode === 'daily') {
            const todayStr = new Date().toDateString();
            return sourceData.filter(e => new Date(e.entry_date).toDateString() === todayStr);
        }
        return sourceData;
    };
    const displayEntries = getDisplayEntries();

    // Formatters
    const formatEntryDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB');
    };
    const formatEntryTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
    };
    const formatSystemTime = (dateStr) => {
        if(!dateStr) return "";
        let s = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
        const d = new Date(s);
        return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // --- HANDLERS ---
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
            setData(prev => ({
                ...prev, entries: res.data.entries, total_in: res.data.total_in, total_out: res.data.total_out, balance: res.data.balance
            }));
            setIsFiltered(true);
        } catch (error) { toast.error("Search Failed"); } finally { setLoading(false); }
    };

    const handleEntry = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/ledger/entry', {
                ...entryForm,
                ledger_account_id: entryForm.ledger_account_id || null,
                description: entryForm.description.toUpperCase(),
                txn_type: txnType
            });
            toast.success("Saved!");
            setEntryForm({ ledger_account_id: "", amount: "", entry_date: getCurrentLocalTime(), description: "" });
            setShowEntryModal(false); fetchLedger();
        } catch (error) { toast.error("Failed"); }
    };

    const handleDeleteEntry = async (id) => { if(!confirm("Delete?")) return; try { await api.delete(`/api/ledger/entry/${id}`); toast.success("Deleted"); if(isFiltered) handleSearch(); else fetchLedger(); } catch (error) { toast.error("Failed"); } };
    const handleSaveAccount = async (e) => { e.preventDefault(); try { if (isEditingAccount) await api.put(`/api/ledger/account/${accountForm.id}`, { name: accountForm.name.toUpperCase(), mobile: accountForm.mobile }); else await api.post('/api/ledger/account', { name: accountForm.name.toUpperCase(), mobile: accountForm.mobile }); toast.success("Success"); setAccountForm({ id: null, name: "", mobile: "" }); setIsEditingAccount(false); fetchLedger(); } catch (error) { toast.error("Failed"); } };
    const handleEditAccountClick = (acc) => { setAccountForm({ id: acc.id, name: acc.name, mobile: acc.mobile || "" }); setIsEditingAccount(true); };
    const handleDeleteAccount = async (id) => { if(!confirm("Delete?")) return; try { await api.delete(`/api/ledger/account/${id}`); toast.success("Deleted"); fetchLedger(); } catch (error) { toast.error("Failed"); } };
    const handleSendReminder = async (accountId) => { if(!accountId) return; if(!confirm("Send WhatsApp?")) return; setSendingMsgId(accountId); try { await api.post('/api/ledger/send-reminder', { account_id: accountId }); toast.success("Sent!"); } catch (error) { toast.error("Failed"); } finally { setSendingMsgId(null); } };
    const clearFilters = () => { setFilters({ account_id: "", from_date: "", to_date: "", keyword: "" }); setIsFiltered(false); fetchLedger(); };
    const handlePrint = () => { window.print(); };

    return (
        <div className="bg-light min-vh-100">
            <div className="d-print-none"><UserNavbar /></div>

            <div className="d-none d-print-block text-center mb-4 pt-4">
                <h2 className="fw-bold">Prince RTO - Cash Book</h2>
                <p>Generated: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="container mt-4 pb-5">

                {/* 1. STATS (HIDDEN FOR LEVEL 0) */}
                {isLevel1 && (
                    <div className="row g-3 mb-4 d-print-none">
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-5 border-primary position-relative">
                                <div className="d-flex justify-content-between align-items-start mb-1">
                                    <small className="text-muted fw-bold">NET BALANCE (CASH IN HAND)</small>
                                    {!isFiltered && (
                                        <div className="btn-group btn-group-sm" role="group">
                                            <button type="button" className={`btn ${viewMode === 'daily' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('daily')}>Today</button>
                                            <button type="button" className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('all')}>All</button>
                                        </div>
                                    )}
                                </div>
                                <h2 className={`fw-bold mb-0 ${currentStats.balance >= 0 ? 'text-primary' : 'text-danger'}`}>{currentStats.balance >= 0 ? 'Cr ' : 'Dr '} ₹{Number(Math.abs(currentStats.balance)).toLocaleString()}</h2>
                                {filters.account_id && (<button onClick={() => handleSendReminder(filters.account_id)} className="btn btn-sm btn-success position-absolute bottom-0 end-0 m-3 fw-bold" disabled={sendingMsgId === filters.account_id}>{sendingMsgId === filters.account_id ? <span>...</span> : <span><i className="bi bi-whatsapp me-1"></i> Send Due</span>}</button>)}
                            </div>
                        </div>
                        <div className="col-6 col-md-4"><div className="card border-0 shadow-sm p-3 bg-success-subtle h-100"><small className="text-success fw-bold text-uppercase">TOTAL IN ({viewMode})</small><h4 className="fw-bold mb-0 text-success">₹{Number(currentStats.in).toLocaleString()}</h4></div></div>
                        <div className="col-6 col-md-4"><div className="card border-0 shadow-sm p-3 bg-danger-subtle h-100"><small className="text-danger fw-bold text-uppercase">TOTAL OUT ({viewMode})</small><h4 className="fw-bold mb-0 text-danger">₹{Number(currentStats.out).toLocaleString()}</h4></div></div>
                    </div>
                )}

                {/* 2. ACTIONS */}
                <div className="card border-0 shadow-sm mb-4 d-print-none">
                    <div className="card-body p-4">
                        <h5 className="fw-bold mb-3">Quick Actions</h5>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <button onClick={() => { setAccountForm({ id: null, name: "", mobile: "" }); setIsEditingAccount(false); setShowAccountModal(true); }} className="btn btn-outline-primary w-100 py-3 fw-bold border-2 shadow-sm"><i className="bi bi-gear-fill me-2"></i> Manage Accounts</button>
                            </div>
                            <div className="col-md-6">
                                <button onClick={() => {setTxnType("IN"); setShowEntryModal(true);}} className="btn btn-primary w-100 py-3 fw-bold shadow-sm"><i className="bi bi-cash-coin me-2"></i> Cash In / Out</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. FILTER */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white py-3 fw-bold d-flex justify-content-between align-items-center d-print-none">
                        <span><i className="bi bi-filter-circle me-2"></i> Filter Data</span>
                        <button onClick={handlePrint} className="btn btn-sm btn-secondary"><i className="bi bi-printer me-2"></i> Print</button>
                    </div>
                    <div className="card-body bg-light d-print-none">
                        <form onSubmit={handleSearch} className="row g-2 align-items-end">
                            <div className="col-md-3"><label className="small fw-bold text-muted">Account</label><select className="form-select form-select-sm" value={filters.account_id} onChange={e => setFilters({...filters, account_id: e.target.value})}><option value="">-- All --</option>{data.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                            <div className="col-md-2"><label className="small fw-bold text-muted">From</label><input type="date" className="form-control form-select-sm" value={filters.from_date} onChange={e => setFilters({...filters, from_date: e.target.value})} /></div>
                            <div className="col-md-2"><label className="small fw-bold text-muted">To</label><input type="date" className="form-control form-select-sm" value={filters.to_date} onChange={e => setFilters({...filters, to_date: e.target.value})} /></div>
                            <div className="col-md-3"><label className="small fw-bold text-muted">Keyword</label><input type="text" className="form-control form-select-sm" placeholder="Search..." value={filters.keyword} onChange={e => setFilters({...filters, keyword: e.target.value})} /></div>
                            <div className="col-md-2 d-flex gap-1"><button type="submit" className="btn btn-sm btn-primary w-100 fw-bold">Search</button>{isFiltered && <button type="button" onClick={clearFilters} className="btn btn-sm btn-outline-danger"><i className="bi bi-x-lg"></i></button>}</div>
                        </form>
                    </div>
                </div>

                {/* 4. TABLE */}
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white py-3 fw-bold border-bottom d-print-none">
                        {isFiltered ? "Filtered Results" : `Recent Transactions (${viewMode === 'daily' ? 'Today' : 'All'})`}
                    </div>

                    {/* DESKTOP VIEW */}
                    <div className="table-responsive d-none d-md-block">
                        <table className="table table-hover mb-0 align-middle table-bordered border-light" style={{fontSize: '0.95rem'}}>
                            <thead className="table-light"><tr><th className="ps-3">Date</th><th>Account Details</th><th>Description</th><th>Entry By</th><th className="text-center">Type</th><th className="text-end pe-3">Amount</th>{/* Only show Balance column if not filtered */ !isFiltered && <th className="text-end">Balance</th>} {isLevel1 && <th className="text-center d-print-none">Action</th>}</tr></thead>
                            <tbody>
                                {loading ? (<tr><td colSpan="8" className="text-center py-5">Loading...</td></tr>) : displayEntries.length > 0 ? (displayEntries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="ps-3"><div className="fw-bold text-dark">{formatEntryDate(entry.entry_date)}</div>
                                            {/* Hide Time in this Column on Desktop, showing only Date */}
                                            {/* <div className="small text-muted">{formatEntryTime(entry.entry_date)}</div> */}
                                        </td>
                                        <td>
                                            <div className="fw-bold text-dark">{entry.account_name || 'General Cash'}</div>
                                            {entry.account_mobile && <small className="text-muted"><i className="bi bi-phone"></i> {entry.account_mobile}</small>}
                                        </td>
                                        <td>{entry.description || '-'}</td>
                                        <td className="small text-secondary"><div className="fw-bold text-dark fst-italic">{entry.created_by || 'Unknown'}</div><div className="text-muted" style={{fontSize: '0.7rem'}}>{formatSystemTime(entry.created_at)}</div></td>
                                        <td className="text-center">{entry.txn_type === 'IN' ? <span className="badge bg-success-subtle text-success">CREDIT</span> : <span className="badge bg-danger-subtle text-danger">DEBIT</span>}</td>
                                        <td className={`text-end pe-3 fw-bold ${entry.txn_type === 'IN' ? 'text-success' : 'text-danger'}`}>{entry.txn_type === 'IN' ? '+' : '-'} ₹{Number(entry.amount).toLocaleString()}</td>

                                        {/* DESKTOP BALANCE COLUMN */}
                                        {!isFiltered && (
                                            <td className="text-end text-muted fw-bold" style={{fontSize: '0.9rem'}}>
                                                ₹{Number(entry.running_balance).toLocaleString()}
                                            </td>
                                        )}

                                        {isLevel1 && (<td className="text-center d-print-none"><div className="d-flex gap-2 justify-content-center">{entry.ledger_account_id && entry.account_mobile && <button onClick={() => handleSendReminder(entry.ledger_account_id)} className="btn btn-sm btn-outline-success border-0"><i className="bi bi-whatsapp"></i></button>}<button onClick={() => handleDeleteEntry(entry.id)} className="btn btn-sm btn-outline-danger border-0"><i className="bi bi-trash"></i></button></div></td>)}
                                    </tr>
                                ))) : (<tr><td colSpan="8" className="text-center py-5 text-muted">No records found.</td></tr>)}
                            </tbody>
                            {isLevel1 && (<tfoot className="table-light fw-bold"><tr><td colSpan="5" className="text-end">NET TOTALS:</td><td className={`text-end pe-3 fs-5 ${currentStats.balance >= 0 ? 'text-primary' : 'text-danger'}`}>{currentStats.balance >= 0 ? 'Cr ' : 'Dr '} ₹{Number(Math.abs(currentStats.balance)).toLocaleString()}</td><td className="d-print-none" colSpan="2"></td></tr></tfoot>)}
                        </table>
                    </div>

                    {/* MOBILE VIEW - WITH MINI FOOTER & TIME */}
                    <div className="d-block d-md-none bg-light p-2 pb-5">
                        {loading ? (<div className="text-center py-5">Loading...</div>) : displayEntries.length > 0 ? (displayEntries.map((entry) => {
                            const dateStr = formatEntryDate(entry.entry_date);
                            const timeStr = formatEntryTime(entry.entry_date); // SHOWS TIME
                            return (
                                <div className="card shadow-sm border-0 mb-2 rounded-3" key={entry.id}>
                                    <div className="card-body p-2 px-3">
                                        <div className="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1">
                                            <div className="fw-bold text-dark text-truncate" style={{maxWidth: '65%', fontSize: '0.95rem'}}>{entry.account_name || 'General Cash'}</div>
                                            <div className="text-end lh-1">
                                                <small className="text-muted fw-bold d-block" style={{fontSize:'0.8rem'}}>{dateStr}</small>
                                                <small className="text-secondary fw-bold" style={{fontSize: '0.65rem'}}>{timeStr}</small>
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mt-2">
                                            <div className="d-flex align-items-center">
                                                <span className={`badge ${entry.txn_type === 'IN' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} me-2`} style={{fontSize:'0.7rem'}}>{entry.txn_type === 'IN' ? 'IN' : 'OUT'}</span>
                                                <small className="text-secondary fst-italic" style={{fontSize: '0.7rem'}}>{entry.created_by}</small>
                                            </div>

                                            <div className="text-end lh-1">
                                                <div className={`fw-bold ${entry.txn_type === 'IN' ? 'text-success' : 'text-danger'}`} style={{fontSize: '1.1rem'}}>
                                                    ₹{Number(entry.amount).toLocaleString()}
                                                </div>
                                                {/* --- MOBILE BALANCE INDICATOR --- */}
                                                {!isFiltered && entry.running_balance !== undefined && (
                                                    <small className="text-muted fw-bold d-block mt-1" style={{fontSize:'0.75rem'}}>
                                                        Bal: ₹{Number(entry.running_balance).toLocaleString()}
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                        {isLevel1 && (<div className="d-flex justify-content-end gap-3 mt-1 pt-1 border-top">{entry.ledger_account_id && <i className="bi bi-whatsapp text-success" onClick={() => handleSendReminder(entry.ledger_account_id)}></i>}<i className="bi bi-trash text-danger" onClick={() => handleDeleteEntry(entry.id)}></i></div>)}
                                    </div>
                                </div>
                            );
                        })) : (<div className="text-center py-5 text-muted">No records.</div>)}

                        {/* MINI SUMMARY FOR MOBILE (Bottom Sticky Lookalike) */}
                        {isLevel1 && (
                            <div className="card border-0 bg-dark text-white text-center p-3 mt-3 shadow rounded-3">
                                <small className="text-white-50 text-uppercase" style={{fontSize:'0.75rem'}}>Net Balance (Cash In Hand)</small>
                                <h2 className="fw-bold mb-0 text-warning">
                                    {currentStats.balance >= 0 ? 'Cr ' : 'Dr '} ₹{Number(Math.abs(currentStats.balance)).toLocaleString()}
                                </h2>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showAccountModal && (<div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content border-0 shadow-lg"><div className="modal-header"><h5 className="modal-title fw-bold">Manage Account Heads</h5><button className="btn-close" onClick={()=>setShowAccountModal(false)}></button></div><div className="modal-body p-4"><form onSubmit={handleSaveAccount} className="row g-2 align-items-end mb-4 border-bottom pb-4"><div className="col-md-5"><label className="form-label fw-bold small">Account Name *</label><input type="text" className="form-control" placeholder="e.g. RENT" value={accountForm.name} onChange={e => setAccountForm({...accountForm, name: e.target.value.toUpperCase()})} required /></div><div className="col-md-4"><label className="form-label fw-bold small">Mobile (Optional)</label><input type="number" className="form-control" placeholder="10-digit mobile" value={accountForm.mobile} onChange={e => setAccountForm({...accountForm, mobile: e.target.value})} /></div><div className="col-md-3"><button type="submit" className={`btn w-100 fw-bold ${isEditingAccount ? 'btn-warning' : 'btn-primary'}`}>{isEditingAccount ? 'Update' : 'Create'}</button></div>{isEditingAccount && <div className="col-12 text-end"><button type="button" onClick={() => { setIsEditingAccount(false); setAccountForm({id:null, name:"", mobile:""}) }} className="btn btn-link btn-sm text-muted">Cancel Edit</button></div>}</form><h6 className="fw-bold text-muted mb-3">Existing Accounts</h6><div className="table-responsive" style={{maxHeight: '300px', overflowY: 'auto'}}><table className="table table-sm table-hover align-middle"><thead className="table-light sticky-top"><tr><th>Name</th><th>Mobile</th><th className="text-end">Actions</th></tr></thead><tbody>{data.accounts.map(acc => (<tr key={acc.id}><td className="fw-bold">{acc.name}</td><td className="text-muted">{acc.mobile || '-'}</td><td className="text-end"><button onClick={() => handleEditAccountClick(acc)} className="btn btn-sm btn-link text-primary me-2"><i className="bi bi-pencil-square"></i></button><button onClick={() => handleDeleteAccount(acc.id)} className="btn btn-sm btn-link text-danger"><i className="bi bi-trash"></i></button></td></tr>))}</tbody></table></div></div></div></div></div>)}
            {/* CASH ENTRY MODAL */}
            {showEntryModal && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header border-bottom-0 pb-0"><h5 className="modal-title fw-bold">Cash Transaction</h5><button className="btn-close" onClick={()=>setShowEntryModal(false)}></button></div><div className="modal-body p-4"><form onSubmit={handleEntry}><div className="d-flex gap-2 mb-4 p-1 bg-light rounded-pill border"><button type="button" className={`btn w-50 rounded-pill fw-bold ${txnType === 'IN' ? 'btn-success shadow-sm' : 'text-muted'}`} onClick={() => setTxnType("IN")}>CASH IN</button><button type="button" className={`btn w-50 rounded-pill fw-bold ${txnType === 'OUT' ? 'btn-danger shadow-sm' : 'text-muted'}`} onClick={() => setTxnType("OUT")}>CASH OUT</button></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Select Account (Optional)</label><select className="form-select" value={entryForm.ledger_account_id} onChange={e => setEntryForm({...entryForm, ledger_account_id: e.target.value})}><option value="">-- General / None --</option>{data.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} {acc.mobile ? `(${acc.mobile})` : ''}</option>)}</select></div><div className="row mb-3"><div className="col-6"><label className="form-label small fw-bold text-muted">Amount (₹)</label><input type="number" className="form-control fw-bold fs-5" placeholder="0" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} required /></div><div className="col-6"><label className="form-label small fw-bold text-muted">Date</label>
                    <input
                        type="datetime-local"
                        className="form-control"
                        value={entryForm.entry_date}
                        onChange={e => setEntryForm({...entryForm, entry_date: e.target.value})}
                        required
                        disabled={!isLevel1}
                    />
                    </div></div><div className="mb-3"><label className="form-label small fw-bold text-muted">Description</label><input type="text" className="form-control" placeholder="NOTES..." value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value.toUpperCase()})} /></div><div className="d-grid mt-4"><button type="submit" className={`btn py-2 fw-bold ${txnType === 'IN' ? 'btn-success' : 'btn-danger'}`}>{txnType === 'IN' ? 'Receive Payment' : 'Record Expense'}</button></div></form></div></div></div></div>
            )}
        </div>
    );
}
