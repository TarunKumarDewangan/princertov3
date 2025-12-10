import { useState } from "react";
import api from "../api";
import toast from 'react-hot-toast';
import UserNavbar from "./UserNavbar";

export default function BackupPage() {
    // Selection State
    const [selection, setSelection] = useState({
        master: true,
        citizen: true, vehicle: true,
        tax: true, insurance: true, fitness: true, permit: true, pucc: true, speed_gov: true, vltd: true,
        // NEW MODULES
        cash_flow: true,
        work_book: true,
        licenses: true
    });

    const [downloading, setDownloading] = useState(false);

    const handleToggle = (key) => {
        setSelection(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelectAll = () => {
        const allSelected = Object.values(selection).every(v => v);
        const newState = {};
        Object.keys(selection).forEach(k => newState[k] = !allSelected);
        setSelection(newState);
    };

    const handleDownload = async () => {
        const activeKeys = Object.keys(selection).filter(k => selection[k]);

        if (activeKeys.length === 0) {
            toast.error("Please select at least one file.");
            return;
        }

        setDownloading(true);
        const queryString = activeKeys.join(',');

        try {
            const res = await api.get(`/api/backup/get-link?include=${queryString}`);
            window.location.href = res.data.url; // Trigger Download
            toast.success("Backup Started!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate backup.");
        } finally {
            setDownloading(false);
        }
    };

    const OptionCard = ({ label, id, desc, color = 'bg-white' }) => (
        <div className="col-md-6">
            <div
                className={`border rounded p-3 d-flex align-items-center h-100 ${selection[id] ? 'border-success bg-success-subtle' : color}`}
                onClick={() => handleToggle(id)}
                style={{cursor: 'pointer', transition: '0.2s'}}
            >
                <div className="form-check me-3">
                    <input className="form-check-input fs-5" type="checkbox" checked={selection[id]} onChange={()=>{}} style={{pointerEvents:'none'}} />
                </div>
                <div>
                    <div className="fw-bold text-dark text-uppercase">{label}</div>
                    {desc && <small className="text-muted d-block">{desc}</small>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-light min-vh-100">
            <UserNavbar />

            <div className="container mt-4 pb-5" style={{maxWidth: '900px'}}>

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold text-primary">Data Backup</h3>
                    <button className="btn btn-outline-dark btn-sm fw-bold" onClick={handleSelectAll}>
                        <i className="bi bi-check-all me-1"></i> Toggle All
                    </button>
                </div>

                <div className="row g-3">

                    {/* 1. MASTER RECORD */}
                    <div className="col-12">
                        <div
                            className={`border rounded p-4 d-flex align-items-center border-primary bg-white shadow-sm`}
                            onClick={() => handleToggle('master')}
                            style={{cursor: 'pointer', transition: '0.2s'}}
                        >
                            <div className="form-check me-3">
                                <input className="form-check-input fs-4" type="checkbox" checked={selection.master} onChange={()=>{}} />
                            </div>
                            <div>
                                <h5 className="fw-bold text-primary mb-1">MASTER COMBINED RECORD (All Vehicles)</h5>
                                <small className="text-muted">Single CSV containing Owner Info, Vehicle Details, and <strong>Latest Expiry Dates</strong> for all documents (Tax, Ins, Fit, etc.) in one row.</small>
                            </div>
                        </div>
                    </div>

                    <div className="col-12"><hr className="text-muted" /></div>

                    {/* 2. NEW MODULES */}
                    <OptionCard id="cash_flow" label="Cash Flow (Ledger)" desc="Accounts, Income & Expense Entries" />
                    <OptionCard id="work_book" label="Work Book" desc="Clients List & Job History" />
                    <OptionCard id="licenses" label="LL / DL Flow" desc="Learner & Driving License Data" />

                    <div className="col-12"><hr className="text-muted" /></div>

                    {/* 3. INDIVIDUAL RTO TABLES */}
                    <OptionCard id="citizen" label="Citizen Table" />
                    <OptionCard id="vehicle" label="Vehicle Table" />
                    <OptionCard id="tax" label="Road Tax" />
                    <OptionCard id="insurance" label="Insurance" />
                    <OptionCard id="fitness" label="Fitness" />
                    <OptionCard id="permit" label="Permit" />
                    <OptionCard id="pucc" label="PUCC" />
                    <OptionCard id="speed_gov" label="Speed Governor" />
                    <OptionCard id="vltd" label="VLTD" />

                </div>

                <div className="text-center mt-5">
                    <button
                        className="btn btn-success btn-lg px-5 shadow fw-bold"
                        onClick={handleDownload}
                        disabled={downloading}
                    >
                        {downloading ? <span><span className="spinner-border spinner-border-sm me-2"></span> Generating Zip...</span> : <span><i className="bi bi-download me-2"></i> Download Backup (.ZIP)</span>}
                    </button>
                </div>

            </div>
        </div>
    );
}
