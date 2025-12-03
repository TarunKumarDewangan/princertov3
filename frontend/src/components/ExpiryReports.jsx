import { useState, useEffect } from "react";
import api from "../api";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import UserNavbar from "./UserNavbar";

export default function ExpiryReports() {
    const [searchParams] = useSearchParams();
    const urlCitizenId = searchParams.get("citizen_id") || "";

    const [filters, setFilters] = useState({
        owner_name: '', vehicle_no: '', doc_type: '', expiry_from: '', expiry_upto: '', citizen_id: urlCitizenId
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sendingIndex, setSendingIndex] = useState(null);

    // --- MODAL STATE ---
    const [activeModal, setActiveModal] = useState(null); // 'Tax', 'Insurance', etc.
    const [editingId, setEditingId] = useState(null); // The ID of the document (tax_id, etc.)
    const [editingVehicleReg, setEditingVehicleReg] = useState("");

    // --- FORMS (Reused from CitizenDetails) ---
    const [taxForm, setTaxForm] = useState({ tax_mode: "", govt_fee: "", bill_amount: "", type: "", from_date: "", upto_date: "" });
    const [insForm, setInsForm] = useState({ company: "", type: "", actual_amount: "", bill_amount: "", start_date: "", end_date: "" });
    const [puccForm, setPuccForm] = useState({ pucc_number: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });
    const [fitForm, setFitForm] = useState({ fitness_no: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });
    const [vltdForm, setVltdForm] = useState({ vendor_name: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });
    const [permitForm, setPermitForm] = useState({ permit_number: "", permit_type: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });
    const [spdForm, setSpdForm] = useState({ governor_number: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });

    // Options
    const taxModes = ["MTT", "QTT", "HYT", "YTT", "LTT"];
    const insTypes = ["1st Party", "3rd Party"];

    const fetchReport = async (pageNo = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ ...filters, page: pageNo });
            for (const [key, value] of params.entries()) { if (!value) params.delete(key); }
            const res = await api.get(`/api/reports/expiry?${params.toString()}`);
            setData(res.data);
        } catch (err) { console.error("Failed to load"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(1); }, [urlCitizenId]);

    // --- OPEN MODAL HANDLER ---
    const handleOpenEdit = (record) => {
        setEditingId(record.doc_id); // This comes from our backend change
        setEditingVehicleReg(record.registration_no);
        setActiveModal(record.doc_type);

        // Pre-fill dates from report (Other fields will be blank as we don't fetch full details in report)
        // User is likely renewing, so blank fields are fine, or they fill them.
        if(record.doc_type === 'Tax') setTaxForm({ ...taxForm, upto_date: record.expiry_date.split(' ')[0] });
        if(record.doc_type === 'Insurance') setInsForm({ ...insForm, end_date: record.expiry_date.split(' ')[0] });
        if(record.doc_type === 'PUCC') setPuccForm({ ...puccForm, valid_until: record.expiry_date.split(' ')[0] });
        if(record.doc_type === 'Fitness') setFitForm({ ...fitForm, valid_until: record.expiry_date.split(' ')[0] });
        if(record.doc_type === 'VLTD') setVltdForm({ ...vltdForm, valid_until: record.expiry_date.split(' ')[0] });
        if(record.doc_type === 'Permit') setPermitForm({ ...permitForm, valid_until: record.expiry_date.split(' ')[0] });
        if(record.doc_type === 'Speed Gov') setSpdForm({ ...spdForm, valid_until: record.expiry_date.split(' ')[0] });
    };

    // --- UPDATE HANDLERS ---
    const handleUpdate = async (e, endpoint, payload) => {
        e.preventDefault();
        try {
            await api.put(endpoint, payload);
            toast.success("Document Updated Successfully!");
            setActiveModal(null);
            fetchReport(data?.current_page || 1); // Refresh list
        } catch (error) {
            toast.error("Update failed.");
        }
    };

    // --- RENDER HELPERS ---
    const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
    const handleSearch = (e) => { e.preventDefault(); fetchReport(1); };
    const handleReset = () => { setFilters({ owner_name: '', vehicle_no: '', doc_type: '', expiry_from: '', expiry_upto: '', citizen_id: '' }); };
    const handleSendMsg = async (record, index) => {
        setSendingIndex(index);
        try {
            await api.post('/api/reports/send-notification', { citizen_id: record.citizen_id, registration_no: record.registration_no, doc_type: record.doc_type, expiry_date: record.expiry_date });
            toast.success("WhatsApp Message Sent!");
        } catch (error) { toast.error("Failed to send."); }
        finally { setSendingIndex(null); }
    };
    const getTypeColor = (type) => { switch (type) { case 'Tax': return 'bg-secondary'; case 'Insurance': return 'bg-primary'; case 'Fitness': return 'bg-info text-dark'; case 'PUCC': return 'bg-success'; case 'Permit': return 'bg-warning text-dark'; default: return 'bg-dark'; } };

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />
            <div className="container mt-4 pb-5">
                <h3 className="text-primary fw-bold mb-4">{urlCitizenId ? "Expiry Report (Single Citizen)" : "Expiry Reports (All)"}</h3>

                {/* FILTERS */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white fw-bold">Filter Records</div>
                    <div className="card-body">
                        <form onSubmit={handleSearch}>
                            <div className="row g-3">
                                <div className="col-md-3"><label className="form-label small fw-bold">Owner</label><input type="text" className="form-control" name="owner_name" value={filters.owner_name} onChange={handleFilterChange} placeholder="Search Owner" /></div>
                                <div className="col-md-3"><label className="form-label small fw-bold">Vehicle</label><input type="text" className="form-control" name="vehicle_no" value={filters.vehicle_no} onChange={handleFilterChange} placeholder="e.g. CG04..." /></div>
                                <div className="col-md-2"><label className="form-label small fw-bold">Doc Type</label><select className="form-select" name="doc_type" value={filters.doc_type} onChange={handleFilterChange}><option value="">All Types</option><option value="Tax">Tax</option><option value="Insurance">Insurance</option><option value="Fitness">Fitness</option><option value="Permit">Permit</option><option value="PUCC">PUCC</option><option value="Speed Gov">Speed Gov</option><option value="VLTD">VLTD</option></select></div>
                                <div className="col-md-2"><label className="form-label small fw-bold">From</label><input type="date" className="form-control" name="expiry_from" value={filters.expiry_from} onChange={handleFilterChange} /></div>
                                <div className="col-md-2"><label className="form-label small fw-bold">Upto</label><input type="date" className="form-control" name="expiry_upto" value={filters.expiry_upto} onChange={handleFilterChange} /></div>
                            </div>
                            <div className="mt-3 d-flex justify-content-end gap-2"><button type="button" className="btn btn-secondary" onClick={handleReset}>Reset</button><button type="submit" className="btn btn-primary">Search</button></div>
                        </form>
                    </div>
                </div>

                {/* TABLE */}
                <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light"><tr><th className="ps-4">Owner</th><th>Mobile</th><th>Vehicle</th><th>Type</th><th>Expiry</th><th>Action</th></tr></thead>
                                <tbody>
                                    {loading ? <tr><td colSpan="6" className="text-center py-5">Loading...</td></tr> :
                                    data?.data?.length > 0 ? data.data.map((r, i) => (
                                        <tr key={i}>
                                            <td className="ps-4 fw-bold text-primary">{r.owner_name}</td>
                                            <td>{r.mobile_number}</td>
                                            <td className="fw-bold">{r.registration_no}</td>
                                            <td><span className={`badge rounded-pill ${getTypeColor(r.doc_type)}`}>{r.doc_type}</span></td>
                                            <td className={new Date(r.expiry_date) < new Date() ? "text-danger fw-bold" : "text-dark"}>
                                                {new Date(r.expiry_date).toLocaleDateString('en-GB')}
                                                {new Date(r.expiry_date) < new Date() && <span className="badge bg-danger ms-2" style={{ fontSize: '0.6rem' }}>EXP</span>}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Link to={`/citizens/${r.citizen_id}`} className="btn btn-sm btn-outline-primary" title="View Citizen"><i className="bi bi-eye"></i></Link>
                                                    <button className="btn btn-sm btn-outline-dark" onClick={() => handleOpenEdit(r)} title="Edit / Renew"><i className="bi bi-pencil-square"></i></button>
                                                    <button className="btn btn-sm btn-success text-white" onClick={() => handleSendMsg(r, i)} disabled={sendingIndex === i} title="WhatsApp">{sendingIndex === i ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-whatsapp"></i>}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="6" className="text-center py-5 text-muted">No records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* PAGINATION */}
                    {data && data.last_page > 1 && (
                        <div className="card-footer bg-white d-flex justify-content-end py-3"><nav><ul className="pagination mb-0"><li className={`page-item ${data.current_page === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => fetchReport(data.current_page - 1)}>Prev</button></li><li className="page-item active"><span className="page-link">Page {data.current_page} of {data.last_page}</span></li><li className={`page-item ${data.current_page === data.last_page ? 'disabled' : ''}`}><button className="page-link" onClick={() => fetchReport(data.current_page + 1)}>Next</button></li></ul></nav></div>
                    )}
                </div>
            </div>

            {/* --- SHARED MODAL WRAPPER --- */}
            {activeModal && (
                <div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header py-2">
                                <h5 className="modal-title fw-bold">Update {activeModal} - {editingVehicleReg}</h5>
                                <button className="btn-close" onClick={() => setActiveModal(null)}></button>
                            </div>
                            <div className="modal-body p-4">

                                {/* TAX FORM */}
                                {activeModal === 'Tax' && (
                                    <form onSubmit={(e) => handleUpdate(e, `/api/taxes/${editingId}`, taxForm)}>
                                        <div className="row g-2 mb-2"><div className="col-md-3"><select className="form-select" value={taxForm.tax_mode} onChange={(e)=>setTaxForm({...taxForm,tax_mode:e.target.value})}><option value="">Mode</option>{taxModes.map(m=><option key={m} value={m}>{m}</option>)}</select></div><div className="col-md-3"><input type="number" className="form-control" placeholder="Govt" value={taxForm.govt_fee} onChange={(e)=>setTaxForm({...taxForm,govt_fee:e.target.value})}/></div><div className="col-md-3"><input type="number" className="form-control" placeholder="Bill" value={taxForm.bill_amount} onChange={(e)=>setTaxForm({...taxForm,bill_amount:e.target.value})}/></div><div className="col-md-3"><input type="text" className="form-control" placeholder="Type" value={taxForm.type} onChange={(e)=>setTaxForm({...taxForm,type:e.target.value.toUpperCase()})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><label className="small text-muted">From</label><input type="date" className="form-control" value={taxForm.from_date} onChange={(e)=>setTaxForm({...taxForm,from_date:e.target.value})}/></div><div className="col-md-6"><label className="small text-muted">Upto</label><input type="date" className="form-control" value={taxForm.upto_date} onChange={(e)=>setTaxForm({...taxForm,upto_date:e.target.value})} required/></div></div><button className="btn btn-primary w-100">Update Tax</button>
                                    </form>
                                )}

                                {/* INSURANCE FORM */}
                                {activeModal === 'Insurance' && (
                                    <form onSubmit={(e) => handleUpdate(e, `/api/insurances/${editingId}`, insForm)}>
                                        <div className="row g-2 mb-2"><div className="col-md-6"><input type="text" className="form-control" placeholder="Company" value={insForm.company} onChange={(e)=>setInsForm({...insForm,company:e.target.value.toUpperCase()})}/></div><div className="col-md-6"><select className="form-select" value={insForm.type} onChange={(e)=>setInsForm({...insForm,type:e.target.value})}><option value="">Type</option>{insTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control" placeholder="Actual" value={insForm.actual_amount} onChange={(e)=>setInsForm({...insForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control" placeholder="Bill" value={insForm.bill_amount} onChange={(e)=>setInsForm({...insForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><label className="small text-muted">Start</label><input type="date" className="form-control" value={insForm.start_date} onChange={(e)=>setInsForm({...insForm,start_date:e.target.value})}/></div><div className="col-md-6"><label className="small text-muted">End</label><input type="date" className="form-control" value={insForm.end_date} onChange={(e)=>setInsForm({...insForm,end_date:e.target.value})} required/></div></div><button className="btn btn-primary w-100">Update Insurance</button>
                                    </form>
                                )}

                                {/* PUCC FORM */}
                                {activeModal === 'PUCC' && (
                                    <form onSubmit={(e) => handleUpdate(e, `/api/puccs/${editingId}`, puccForm)}>
                                        <div className="mb-2"><input type="text" className="form-control" placeholder="PUCC No" value={puccForm.pucc_number} onChange={(e)=>setPuccForm({...puccForm,pucc_number:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control" placeholder="Actual" value={puccForm.actual_amount} onChange={(e)=>setPuccForm({...puccForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control" placeholder="Bill" value={puccForm.bill_amount} onChange={(e)=>setPuccForm({...puccForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><label className="small text-muted">From</label><input type="date" className="form-control" value={puccForm.valid_from} onChange={(e)=>setPuccForm({...puccForm,valid_from:e.target.value})}/></div><div className="col-md-6"><label className="small text-muted">Until</label><input type="date" className="form-control" value={puccForm.valid_until} onChange={(e)=>setPuccForm({...puccForm,valid_until:e.target.value})} required/></div></div><button className="btn btn-primary w-100">Update PUCC</button>
                                    </form>
                                )}

                                {/* FITNESS FORM */}
                                {activeModal === 'Fitness' && (
                                    <form onSubmit={(e) => handleUpdate(e, `/api/fitness/${editingId}`, fitForm)}>
                                        <div className="mb-2"><input type="text" className="form-control" placeholder="Fit No" value={fitForm.fitness_no} onChange={(e)=>setFitForm({...fitForm,fitness_no:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control" placeholder="Actual" value={fitForm.actual_amount} onChange={(e)=>setFitForm({...fitForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control" placeholder="Bill" value={fitForm.bill_amount} onChange={(e)=>setFitForm({...fitForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><label className="small text-muted">From</label><input type="date" className="form-control" value={fitForm.valid_from} onChange={(e)=>setFitForm({...fitForm,valid_from:e.target.value})}/></div><div className="col-md-6"><label className="small text-muted">Until</label><input type="date" className="form-control" value={fitForm.valid_until} onChange={(e)=>setFitForm({...fitForm,valid_until:e.target.value})} required/></div></div><button className="btn btn-primary w-100">Update Fitness</button>
                                    </form>
                                )}

                                {/* PERMIT FORM */}
                                {activeModal === 'Permit' && (
                                    <form onSubmit={(e) => handleUpdate(e, `/api/permits/${editingId}`, permitForm)}>
                                        <div className="mb-2"><input type="text" className="form-control" placeholder="Permit No" value={permitForm.permit_number} onChange={(e)=>setPermitForm({...permitForm,permit_number:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control" placeholder="Actual" value={permitForm.actual_amount} onChange={(e)=>setPermitForm({...permitForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control" placeholder="Bill" value={permitForm.bill_amount} onChange={(e)=>setPermitForm({...permitForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><label className="small text-muted">From</label><input type="date" className="form-control" value={permitForm.valid_from} onChange={(e)=>setPermitForm({...permitForm,valid_from:e.target.value})}/></div><div className="col-md-6"><label className="small text-muted">Until</label><input type="date" className="form-control" value={permitForm.valid_until} onChange={(e)=>setPermitForm({...permitForm,valid_until:e.target.value})} required/></div></div><button className="btn btn-primary w-100">Update Permit</button>
                                    </form>
                                )}

                                {/* VLTD FORM */}
                                {activeModal === 'VLTD' && (
                                    <form onSubmit={(e) => handleUpdate(e, `/api/vltds/${editingId}`, vltdForm)}>
                                        <div className="mb-2"><input type="text" className="form-control" placeholder="Vendor" value={vltdForm.vendor_name} onChange={(e)=>setVltdForm({...vltdForm,vendor_name:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control" placeholder="Actual" value={vltdForm.actual_amount} onChange={(e)=>setVltdForm({...vltdForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control" placeholder="Bill" value={vltdForm.bill_amount} onChange={(e)=>setVltdForm({...vltdForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><label className="small text-muted">From</label><input type="date" className="form-control" value={vltdForm.valid_from} onChange={(e)=>setVltdForm({...vltdForm,valid_from:e.target.value})}/></div><div className="col-md-6"><label className="small text-muted">Until</label><input type="date" className="form-control" value={vltdForm.valid_until} onChange={(e)=>setVltdForm({...vltdForm,valid_until:e.target.value})} required/></div></div><button className="btn btn-primary w-100">Update VLTD</button>
                                    </form>
                                )}

                                {/* SPEED GOV FORM */}
                                {activeModal === 'Speed Gov' && (
                                    <form onSubmit={(e) => handleUpdate(e, `/api/speed-governors/${editingId}`, spdForm)}>
                                        <div className="mb-2"><input type="text" className="form-control" placeholder="Gov No" value={spdForm.governor_number} onChange={(e)=>setSpdForm({...spdForm,governor_number:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control" placeholder="Actual" value={spdForm.actual_amount} onChange={(e)=>setSpdForm({...spdForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control" placeholder="Bill" value={spdForm.bill_amount} onChange={(e)=>setSpdForm({...spdForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><label className="small text-muted">From</label><input type="date" className="form-control" value={spdForm.valid_from} onChange={(e)=>setSpdForm({...spdForm,valid_from:e.target.value})}/></div><div className="col-md-6"><label className="small text-muted">Until</label><input type="date" className="form-control" value={spdForm.valid_until} onChange={(e)=>setSpdForm({...spdForm,valid_until:e.target.value})} required/></div></div><button className="btn btn-primary w-100">Update Speed Gov</button>
                                    </form>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
