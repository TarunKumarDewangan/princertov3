import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api";
import UserNavbar from "./UserNavbar";

export default function AccountStatement() {
    const { id } = useParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [editingTxId, setEditingTxId] = useState(null);
    const [editForm, setEditForm] = useState({ amount: "", payment_date: "", remarks: "" });

    const fetchStatement = async () => {
        try {
            const res = await api.get(`/api/citizens/${id}/statement`);
            setData(res.data);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to load statement.");
        }
    };

    useEffect(() => { fetchStatement(); }, [id]);

    // Use Unique Key if available, else fallback to ID
    const getRowKey = (item) => item.unique_key || item.id;

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(data.statement.map(item => getRowKey(item)));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (key) => {
        if (selectedIds.includes(key)) {
            setSelectedIds(selectedIds.filter(k => k !== key));
        } else {
            setSelectedIds([...selectedIds, key]);
        }
    };

    // --- NATIVE PRINT FUNCTION ---
    const handlePrint = () => {
        window.print();
    };

    // --- CALCULATE TOTALS (DYNAMIC) ---
    // If items are selected, calculate total based on SELECTION.
    // If nothing selected (or all), calculate based on ALL.
    const itemsToCalc = selectedIds.length > 0
        ? data?.statement.filter(item => selectedIds.includes(getRowKey(item)))
        : data?.statement || [];

    const totalBilled = itemsToCalc.reduce((sum, item) => sum + Number(item.bill_amount), 0);
    const totalPaid = itemsToCalc.reduce((sum, item) => sum + Number(item.paid), 0);
    const totalDue = totalBilled - totalPaid;

    // ... (Edit/Delete handlers remain same) ...
    const startEdit = (pay) => { setEditingTxId(pay.id); setEditForm({ amount: pay.amount, payment_date: pay.payment_date, remarks: pay.remarks || "" }); };
    const cancelEdit = () => setEditingTxId(null);
    const saveEdit = async (paymentId) => { try { await api.put(`/api/payments/${paymentId}`, editForm); toast.success("Payment Updated"); setEditingTxId(null); fetchStatement(); } catch (error) { toast.error("Update failed."); } };
    const handleDeletePayment = async (paymentId) => { if (!confirm("Delete this payment?")) return; try { await api.delete(`/api/payments/${paymentId}`); toast.success("Payment Deleted"); fetchStatement(); } catch (error) { toast.error("Delete failed."); } };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="bg-light min-vh-100">

            {/* --- CSS FOR PRINTING --- */}
            <style>
                {`
                    @media print {
                        @page { size: A4; margin: 10mm; }
                        body { background-color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

                        /* Hide Elements */
                        .d-print-none { display: none !important; }
                        .navbar, .btn, input[type="checkbox"] { display: none !important; }

                        /* Layout Adjustments */
                        .container { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
                        .card { border: none !important; box-shadow: none !important; background: none !important; }

                        /* Show Elements */
                        .d-print-block { display: block !important; }

                        /* Table Styling */
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid black !important; padding: 8px; }
                        .table-light { background-color: #f0f0f0 !important; }

                        /* Footer */
                        .print-footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #666; }
                    }
                `}
            </style>

            <div className="d-print-none">
                <UserNavbar />
            </div>

            <div className="container mt-4 pb-5">

                {/* --- HEADER (Print Friendly) --- */}
                <div className="d-flex justify-content-between align-items-start mb-4 border-bottom pb-3">
                    <div>
                        <h2 className="d-none d-print-block fw-bold text-primary mb-0">PRINCE RTO</h2>
                        <h3 className="d-print-none text-primary fw-bold mb-1">Account Statement</h3>

                        <h5 className="fw-bold m-0 mt-2">{data.citizen.name}</h5>
                        <p className="text-muted mb-0">Mobile: {data.citizen.mobile_number}</p>
                        <p className="text-muted mb-0 d-none d-print-block">{data.citizen.city_district}</p>
                    </div>

                    <div className="text-end">
                        <div className="d-flex gap-2 d-print-none">
                            <Link to={`/citizens/${id}`} className="btn btn-outline-secondary">
                                <i className="bi bi-arrow-left"></i> Back
                            </Link>
                            <button onClick={handlePrint} className="btn btn-primary" disabled={selectedIds.length === 0}>
                                <i className="bi bi-printer me-2"></i> Print Selected
                            </button>
                        </div>
                        <div className="d-none d-print-block">
                            <h4 className="fw-bold m-0">STATEMENT</h4>
                            <small>Date: {new Date().toLocaleDateString('en-GB')}</small>
                        </div>
                    </div>
                </div>

                {/* --- TOTALS CARDS (Updates based on selection) --- */}
                <div className="row g-3 mb-4 text-center">
                    <div className="col-4">
                        <div className="card border-0 shadow-sm p-3 bg-white border">
                            <small className="text-muted fw-bold">TOTAL BILLED</small>
                            <h3 className="text-primary mb-0">₹{totalBilled.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="card border-0 shadow-sm p-3 bg-white border">
                            <small className="text-muted fw-bold">TOTAL PAID</small>
                            <h3 className="text-success mb-0">₹{totalPaid.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="card border-0 shadow-sm p-3 border" style={{backgroundColor: totalDue > 0 ? '#ffe6e6' : '#e6fffa'}}>
                            <small className="text-muted fw-bold">BALANCE DUE</small>
                            <h3 className={totalDue > 0 ? "text-danger mb-0" : "text-success mb-0"}>₹{totalDue.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                {/* --- TABLE --- */}
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table mb-0 align-middle table-bordered border-dark">
                            <thead className="table-dark text-center">
                                <tr>
                                    <th style={{width:'40px'}} className="d-print-none">
                                        <input type="checkbox" className="form-check-input" onChange={handleSelectAll} checked={selectedIds.length === data.statement.length && data.statement.length > 0} />
                                    </th>
                                    <th>Date</th>
                                    <th>Vehicle</th>
                                    <th>Service</th>
                                    <th className="text-end">Bill</th>
                                    <th className="text-end">Paid</th>
                                    <th className="text-end">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.statement.map((item, index) => {
                                    const rowKey = getRowKey(item);
                                    const isSelected = selectedIds.includes(rowKey);

                                    // --- THE MAGIC LOGIC ---
                                    // If we have selected items, but THIS item is NOT selected, hide it.
                                    const printClass = (selectedIds.length > 0 && !isSelected) ? 'd-print-none' : '';

                                    return (
                                    <React.Fragment key={index}>
                                        <tr className={`fw-bold ${isSelected ? 'table-warning' : ''} ${printClass}`}>
                                            <td className="d-print-none text-center">
                                                <input type="checkbox" className="form-check-input" checked={isSelected} onChange={() => handleSelectOne(rowKey)} />
                                            </td>
                                            <td>{new Date(item.date).toLocaleDateString('en-GB')}</td>
                                            <td>{item.vehicle}</td>
                                            <td>{item.service}</td>
                                            <td className="text-end">₹{Number(item.bill_amount).toLocaleString()}</td>
                                            <td className="text-end">₹{Number(item.paid).toLocaleString()}</td>
                                            <td className={`text-end ${item.balance > 0 ? 'text-danger' : 'text-success'}`}>₹{Number(item.balance).toLocaleString()}</td>
                                        </tr>
                                        {/* Child Payments - Must inherit visibility from parent */}
                                        {item.payments.map((pay) => (
                                            <tr key={pay.id} className={`${printClass}`} style={{backgroundColor: '#f8f9fa', fontSize: '13px'}}>
                                                <td className="d-print-none"></td>
                                                {editingTxId === pay.id ? (
                                                    <>
                                                        <td colSpan="4" className="ps-4">
                                                            <div className="input-group input-group-sm">
                                                                <input type="date" className="form-control" value={editForm.payment_date} onChange={e => setEditForm({...editForm, payment_date: e.target.value})} />
                                                                <input type="text" className="form-control" value={editForm.remarks} onChange={e => setEditForm({...editForm, remarks: e.target.value})} />
                                                            </div>
                                                        </td>
                                                        <td className="text-end"><input type="number" className="form-control form-control-sm text-end" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} /></td>
                                                        <td className="text-center"><button onClick={() => saveEdit(pay.id)} className="btn btn-success btn-sm me-1">Save</button><button onClick={cancelEdit} className="btn btn-secondary btn-sm">X</button></td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td colSpan="4" className="text-muted ps-4 fst-italic text-start">
                                                            <i className="bi bi-arrow-return-right me-2"></i> Recv ({new Date(pay.payment_date).toLocaleDateString('en-GB')}): {pay.remarks}
                                                        </td>
                                                        <td className="text-end text-success fw-bold">- ₹{Number(pay.amount).toLocaleString()}</td>
                                                        <td className="text-center d-print-none">
                                                            <button onClick={() => startEdit(pay)} className="btn btn-link p-0 me-2 text-primary"><i className="bi bi-pencil-square"></i></button>
                                                            <button onClick={() => handleDeletePayment(pay.id)} className="btn btn-link p-0 text-danger"><i className="bi bi-trash"></i></button>
                                                        </td>
                                                        <td className="d-none d-print-table-cell"></td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                                })}
                                {data.statement.length === 0 && <tr><td colSpan="7" className="text-center py-4">No records found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="d-none d-print-block print-footer">
                    <p>Computer Generated Receipt | Prince RTO Services</p>
                </div>
            </div>
        </div>
    );
}
