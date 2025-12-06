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
        if (!file) return toast.error("Please select an Excel file");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        setLoading(true);
        try {
            const res = await api.post('/api/bulk-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.message);
            setFile(null);
            // Reset file input visually
            document.getElementById('fileInput').value = "";
        } catch (error) {
            toast.error(error.response?.data?.message || "Upload Failed");
        } finally {
            setLoading(false);
        }
    };

    // Instruction Helper
    const getInstructions = () => {
        switch (type) {
            case 'citizens':
                return (
                    <ul className="small text-muted mb-0">
                        <li><strong>Col A:</strong> Name (Required)</li>
                        <li><strong>Col B:</strong> Mobile Number (Required - Unique)</li>
                        <li><strong>Col C:</strong> Address</li>
                        <li><strong>Col D:</strong> State</li>
                        <li><strong>Col E:</strong> City</li>
                    </ul>
                );
            case 'vehicles':
                return (
                    <ul className="small text-muted mb-0">
                        <li><strong>Col A:</strong> Owner Mobile (Required - Must exist in Citizens)</li>
                        <li><strong>Col B:</strong> Reg No (Required - Unique)</li>
                        <li><strong>Col C:</strong> Type (e.g. LMV)</li>
                        <li><strong>Col D:</strong> Model</li>
                        <li><strong>Col E:</strong> Chassis</li>
                        <li><strong>Col F:</strong> Engine</li>
                    </ul>
                );
            default: // Documents (Tax, Pucc, etc)
                return (
                    <ul className="small text-muted mb-0">
                        <li><strong>Col A:</strong> Vehicle Reg No (Required - Must exist)</li>
                        <li><strong>Col B:</strong> Expiry Date (Required - dd-mm-yyyy)</li>
                        <li><strong>Col C:</strong> Bill Amount</li>
                        <li><strong>Col D:</strong> Start Date</li>
                        <li><strong>Col E:</strong> Extra Info (Company/Tax Mode)</li>
                    </ul>
                );
        }
    };

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />
            <div className="container mt-5">
                <div className="card shadow-sm border-0" style={{maxWidth:'700px', margin:'0 auto'}}>
                    <div className="card-header bg-primary text-white py-3">
                        <h5 className="mb-0 fw-bold"><i className="bi bi-file-earmark-spreadsheet me-2"></i> Bulk Data Import</h5>
                    </div>
                    <div className="card-body p-4">

                        <div className="alert alert-warning small border-0 shadow-sm">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            <strong>Important Sequence:</strong> You must upload <b>Citizens</b> first, then <b>Vehicles</b>, and finally <b>Documents</b>.
                        </div>

                        <form onSubmit={handleUpload}>
                            <div className="mb-4">
                                <label className="form-label fw-bold">1. What are you uploading?</label>
                                <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                                    <option value="citizens">Step 1: Citizens (Owners)</option>
                                    <option value="vehicles">Step 2: Vehicles</option>
                                    <hr />
                                    <option value="tax">Document: Road Tax</option>
                                    <option value="pucc">Document: PUCC</option>
                                    <option value="insurance">Document: Insurance</option>
                                    <option value="fitness">Document: Fitness</option>
                                    <option value="permit">Document: Permit</option>
                                    <option value="vltd">Document: VLTD</option>
                                    <option value="speed_gov">Document: Speed Governor</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold">2. Excel Format Requirements</label>
                                <div className="bg-white border rounded p-3">
                                    {getInstructions()}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold">3. Upload File</label>
                                <input
                                    id="fileInput"
                                    type="file"
                                    className="form-control"
                                    accept=".xlsx, .csv"
                                    onChange={e => setFile(e.target.files[0])}
                                />
                            </div>

                            <div className="d-grid">
                                <button type="submit" className="btn btn-success fw-bold py-2" disabled={loading}>
                                    {loading ? (<span><span className="spinner-border spinner-border-sm me-2"></span> Processing Data...</span>) : 'Start Import'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
