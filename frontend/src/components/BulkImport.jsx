import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import UserNavbar from './UserNavbar';

export default function BulkImport() {
    const [file, setFile] = useState(null);
    const [type, setType] = useState("citizens");
    const [loading, setLoading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return toast.error("Select File");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        setLoading(true);
        try {
            const res = await api.post('/api/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message);
            setFile(null);
            document.getElementById('fileInput').value = "";
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed");
        } finally {
            setLoading(false);
        }
    };

    const getInstructions = () => {
        switch (type) {
            case 'citizens': return (<ul><li>Col A: Name</li><li>Col B: Mobile</li><li>Col C: Address</li></ul>);
            case 'vehicles': return (<ul><li>Col A: Owner Mobile</li><li>Col B: Reg No</li><li>Col C: Type</li></ul>);

            // New Modules
            case 'cash_flow': return (<ul><li>Col A: Account Name</li><li>Col B: Date</li><li>Col C: Type (IN/OUT)</li><li>Col D: Amount</li></ul>);
            case 'work_book': return (<ul><li>Col A: Client Name</li><li>Col B: Mobile</li><li>Col C: Date</li><li>Col D: Vehicle</li><li>Col E: Work</li><li>Col F: Bill</li><li>Col G: Paid</li></ul>);
            case 'licenses': return (<ul><li>Col A: Name</li><li>Col B: Mobile</li><li>Col C: DOB</li><li>Col D: LL No</li><li>Col E: DL No</li></ul>);

            // Specific Docs
            case 'vltd': return (<ul><li>Col A: Reg No</li><li>Col B: Expiry Date</li><li>Col C: Amount</li><li>Col D: Start Date</li><li>Col E: Vendor Name</li></ul>);
            case 'permit': return (<ul><li>Col A: Reg No</li><li>Col B: Expiry Date</li><li>Col C: Amount</li><li>Col D: Start Date</li><li>Col E: Permit Type</li></ul>);

            // Default Docs (Tax, Insurance, Fitness, Speed Gov, PUCC)
            default: return (<ul><li>Col A: Reg No</li><li>Col B: Expiry Date</li><li>Col C: Amount</li><li>Col D: Start Date</li><li>Col E: Extra Info</li></ul>);
        }
    };

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />
            <div className="container mt-5">
                <div className="card shadow-sm border-0" style={{maxWidth:'700px', margin:'0 auto'}}>
                    <div className="card-header bg-primary text-white py-3"><h5 className="mb-0 fw-bold">Bulk Data Import</h5></div>
                    <div className="card-body p-4">

                        <div className="alert alert-warning small border-0 shadow-sm mb-4">
                            <i className="bi bi-info-circle-fill me-2"></i>
                            <strong>Note:</strong> Dates must be in <code>dd-mm-yyyy</code> or Excel Date format.
                        </div>

                        <form onSubmit={handleUpload}>
                            <div className="mb-4">
                                <label className="form-label fw-bold">1. Select Data Type</label>
                                <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                                    <optgroup label="Step 1 & 2 (Mandatory)">
                                        <option value="citizens">1. Citizens (Owners)</option>
                                        <option value="vehicles">2. Vehicles</option>
                                    </optgroup>
                                    <optgroup label="Step 3: RTO Documents">
                                        <option value="tax">Road Tax</option>
                                        <option value="insurance">Insurance</option>
                                        <option value="fitness">Fitness</option>
                                        <option value="permit">Permit</option>
                                        <option value="pucc">PUCC</option>
                                        <option value="vltd">VLTD</option>
                                        <option value="speed_gov">Speed Governor</option>
                                    </optgroup>
                                    <optgroup label="Other Modules">
                                        <option value="cash_flow">Cash Flow Ledger</option>
                                        <option value="work_book">Work Book (Jobs)</option>
                                        <option value="licenses">LL / DL Flow</option>
                                    </optgroup>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold">2. Excel Format Requirements</label>
                                <div className="bg-light p-3 border rounded small text-muted">{getInstructions()}</div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold">3. Upload File</label>
                                <input id="fileInput" type="file" className="form-control" accept=".xlsx, .csv" onChange={e => setFile(e.target.files[0])} required />
                            </div>

                            <div className="d-grid"><button type="submit" className="btn btn-success fw-bold py-2" disabled={loading}>{loading ? 'Importing...' : 'Start Import'}</button></div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
