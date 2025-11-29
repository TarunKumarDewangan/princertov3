import { useState, useEffect } from "react";
import api from "../api";
import { Link, useSearchParams } from "react-router-dom";
import UserNavbar from "./UserNavbar";

export default function ExpiryReports() {
    const [searchParams] = useSearchParams();
    const urlCitizenId = searchParams.get("citizen_id") || "";

    const [filters, setFilters] = useState({
        owner_name: '', vehicle_no: '', doc_type: '', expiry_from: '', expiry_upto: '', citizen_id: urlCitizenId
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

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

    const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
    const handleSearch = (e) => { e.preventDefault(); fetchReport(1); };
    const handleReset = () => { setFilters({ owner_name: '', vehicle_no: '', doc_type: '', expiry_from: '', expiry_upto: '', citizen_id: '' }); };
    const getTypeColor = (type) => { switch (type) { case 'Tax': return 'bg-secondary'; case 'Insurance': return 'bg-primary'; case 'Fitness': return 'bg-info text-dark'; case 'PUCC': return 'bg-success'; case 'Permit': return 'bg-warning text-dark'; default: return 'bg-dark'; } };

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />
            <div className="container mt-4 pb-5">
                <h3 className="text-primary fw-bold mb-4">{urlCitizenId ? "Expiry Report (Single Citizen)" : "Expiry Reports (All)"}</h3>

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

                <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light"><tr><th className="ps-4">Owner</th><th>Mobile</th><th>Vehicle</th><th>Type</th><th>Expiry</th><th>Action</th></tr></thead>
                                <tbody>{loading?<tr><td colSpan="6" className="text-center py-5">Loading...</td></tr>:data?.data?.length>0?data.data.map((r,i)=>(<tr key={i}><td className="ps-4 fw-bold text-primary">{r.owner_name}</td><td>{r.mobile_number}</td><td className="fw-bold">{r.registration_no}</td><td><span className={`badge rounded-pill ${getTypeColor(r.doc_type)}`}>{r.doc_type}</span></td><td className={new Date(r.expiry_date)<new Date()?"text-danger fw-bold":"text-dark"}>{new Date(r.expiry_date).toLocaleDateString('en-GB')} {new Date(r.expiry_date)<new Date()&&<span className="badge bg-danger ms-2" style={{fontSize:'0.6rem'}}>EXP</span>}</td><td><Link to={`/citizens/${r.citizen_id}`} className="btn btn-sm btn-outline-primary">View</Link></td></tr>)):<tr><td colSpan="6" className="text-center py-5 text-muted">No records found.</td></tr>}</tbody>
                            </table>
                        </div>
                    </div>
                    {data&&data.last_page>1&&(
                        <div className="card-footer bg-white d-flex justify-content-end py-3"><nav><ul className="pagination mb-0"><li className={`page-item ${data.current_page===1?'disabled':''}`}><button className="page-link" onClick={()=>fetchReport(data.current_page-1)}>Prev</button></li><li className="page-item active"><span className="page-link">Page {data.current_page} of {data.last_page}</span></li><li className={`page-item ${data.current_page===data.last_page?'disabled':''}`}><button className="page-link" onClick={()=>fetchReport(data.current_page+1)}>Next</button></li></ul></nav></div>
                    )}
                </div>
            </div>
        </div>
    );
}
