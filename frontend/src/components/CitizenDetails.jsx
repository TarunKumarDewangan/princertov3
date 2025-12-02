import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";
import UserNavbar from "./UserNavbar";

export default function CitizenDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- MAIN DATA ---
  const [citizen, setCitizen] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- MODAL VISIBILITY ---
  const [showModal, setShowModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showInsModal, setShowInsModal] = useState(false);
  const [showPuccModal, setShowPuccModal] = useState(false);
  const [showFitModal, setShowFitModal] = useState(false);
  const [showVltdModal, setShowVltdModal] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [showSpdModal, setShowSpdModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // --- SELECTION STATES ---
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paymentType, setPaymentType] = useState("");

  // --- LIST DATA ---
  const [taxRecords, setTaxRecords] = useState([]);
  const [insRecords, setInsRecords] = useState([]);
  const [puccRecords, setPuccRecords] = useState([]);
  const [fitRecords, setFitRecords] = useState([]);
  const [vltdRecords, setVltdRecords] = useState([]);
  const [permitRecords, setPermitRecords] = useState([]);
  const [spdRecords, setSpdRecords] = useState([]);

  // --- FORMS ---
  const [vehicleForm, setVehicleForm] = useState({ registration_no: "", type: "", make_model: "", chassis_no: "", engine_no: "" });

  // *** NEW STATE: To track which vehicle is being edited ***
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  const [taxForm, setTaxForm] = useState({ tax_mode: "", govt_fee: "", bill_amount: "", type: "", from_date: "", upto_date: "" });
  const [insForm, setInsForm] = useState({ company: "", type: "", actual_amount: "", bill_amount: "", start_date: "", end_date: "" });
  const [puccForm, setPuccForm] = useState({ pucc_number: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });
  const [fitForm, setFitForm] = useState({ fitness_no: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });
  const [vltdForm, setVltdForm] = useState({ vendor_name: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });
  const [permitForm, setPermitForm] = useState({ permit_number: "", permit_type: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });
  const [spdForm, setSpdForm] = useState({ governor_number: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_date: new Date().toISOString().split('T')[0], remarks: "" });

  // --- EDIT STATES FOR DOCUMENTS ---
  const [isEditingTax, setIsEditingTax] = useState(null);
  const [isEditingIns, setIsEditingIns] = useState(null);
  const [isEditingPucc, setIsEditingPucc] = useState(null);
  const [isEditingFit, setIsEditingFit] = useState(null);
  const [isEditingVltd, setIsEditingVltd] = useState(null);
  const [isEditingPermit, setIsEditingPermit] = useState(null);
  const [isEditingSpd, setIsEditingSpd] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const vehicleTypes = ["Motorcycle", "Car", "LMV", "LGV", "MGV", "HGV", "TRUCK", "OTHERS"];
  const taxModes = ["MTT", "QTT", "HYT", "YTT", "LTT"];
  const insTypes = ["1st Party", "3rd Party"];

  // ===========================
  //      API FETCHING
  // ===========================
  const fetchCitizen = async () => { try { const res = await api.get(`/api/citizens/${id}`); setCitizen(res.data); setLoading(false); } catch (error) { navigate("/citizens"); } };
  const fetchTaxes = async (vid) => { try { const res = await api.get(`/api/vehicles/${vid}/taxes`); setTaxRecords(res.data); } catch (err) { setTaxRecords([]); } };
  const fetchInsurances = async (vid) => { try { const res = await api.get(`/api/vehicles/${vid}/insurances`); setInsRecords(res.data); } catch (err) { setInsRecords([]); } };
  const fetchPuccs = async (vid) => { try { const res = await api.get(`/api/vehicles/${vid}/puccs`); setPuccRecords(res.data); } catch (err) { setPuccRecords([]); } };
  const fetchFitness = async (vid) => { try { const res = await api.get(`/api/vehicles/${vid}/fitness`); setFitRecords(res.data); } catch (err) { setFitRecords([]); } };
  const fetchVltds = async (vid) => { try { const res = await api.get(`/api/vehicles/${vid}/vltds`); setVltdRecords(res.data); } catch (err) { setVltdRecords([]); } };
  const fetchPermits = async (vid) => { try { const res = await api.get(`/api/vehicles/${vid}/permits`); setPermitRecords(res.data); } catch (err) { setPermitRecords([]); } };
  const fetchSpds = async (vid) => { try { const res = await api.get(`/api/vehicles/${vid}/speed-governors`); setSpdRecords(res.data); } catch (err) { setSpdRecords([]); } };

  useEffect(() => { fetchCitizen(); }, [id]);

  // ===========================
  //      VEHICLE HANDLERS
  // ===========================

  // 1. SAVE or UPDATE Vehicle
  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        if (editingVehicleId) {
            // Update Mode
            await api.put(`/api/vehicles/${editingVehicleId}`, vehicleForm);
            toast.success("Vehicle Updated Successfully!");
        } else {
            // Create Mode
            await api.post("/api/vehicles", { ...vehicleForm, citizen_id: id });
            toast.success("Vehicle Added Successfully!");
        }
        setShowModal(false);
        setVehicleForm({ registration_no: "", type: "", make_model: "", chassis_no: "", engine_no: "" });
        setEditingVehicleId(null);
        fetchCitizen();
    } catch (error) {
        toast.error(error.response?.data?.errors?.registration_no?.[0] || "Error saving vehicle.");
    } finally {
        setIsSaving(false);
    }
  };

  // 2. EDIT Click Handler
  const handleEditVehicle = (vehicle) => {
    setEditingVehicleId(vehicle.id);
    setVehicleForm({
        registration_no: vehicle.registration_no,
        type: vehicle.type || "",
        make_model: vehicle.make_model || "",
        chassis_no: vehicle.chassis_no || "",
        engine_no: vehicle.engine_no || "",
    });
    setShowModal(true);
  };

  // 3. DELETE Click Handler
  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm("Are you sure? This will delete the vehicle and ALL its documents (Tax, Insurance, etc.).")) return;
    try {
        await api.delete(`/api/vehicles/${vehicleId}`);
        toast.success("Vehicle Deleted Successfully");
        fetchCitizen();
    } catch (error) {
        toast.error("Failed to delete vehicle.");
    }
  };

  // ===========================
  //      DOCUMENT HANDLERS
  // ===========================

  const openTaxModal = (v) => { setSelectedVehicle(v); setTaxForm({ tax_mode: "", govt_fee: "", bill_amount: "", type: v.type || "", from_date: "", upto_date: "" }); setIsEditingTax(null); fetchTaxes(v.id); setShowTaxModal(true); };
  const handleSaveTax = async (e) => { e.preventDefault(); try { if(isEditingTax) { await api.put(`/api/taxes/${isEditingTax}`, taxForm); toast.success("Updated!"); } else { await api.post("/api/taxes", { ...taxForm, vehicle_id: selectedVehicle.id }); toast.success("Saved!"); } fetchTaxes(selectedVehicle.id); setTaxForm({ ...taxForm, upto_date: "", from_date: "" }); setIsEditingTax(null); } catch (e) { toast.error("Error saving."); } };
  const handleEditTax = (row) => { setTaxForm({ tax_mode: row.tax_mode, govt_fee: row.govt_fee || "", bill_amount: row.bill_amount || "", type: row.type || "", from_date: row.from_date || "", upto_date: row.upto_date }); setIsEditingTax(row.id); };
  const handleDeleteTax = async (id) => { if(!confirm("Delete?")) return; try { await api.delete(`/api/taxes/${id}`); toast.success("Deleted"); fetchTaxes(selectedVehicle.id); } catch(e) { toast.error("Error."); } };

  const openInsModal = (v) => { setSelectedVehicle(v); setInsForm({ company: "", type: "", actual_amount: "", bill_amount: "", start_date: "", end_date: "" }); setIsEditingIns(null); fetchInsurances(v.id); setShowInsModal(true); };
  const handleSaveIns = async (e) => { e.preventDefault(); try { if(isEditingIns) { await api.put(`/api/insurances/${isEditingIns}`, insForm); toast.success("Updated!"); } else { await api.post("/api/insurances", { ...insForm, vehicle_id: selectedVehicle.id }); toast.success("Saved!"); } fetchInsurances(selectedVehicle.id); setInsForm({ ...insForm, end_date: "", start_date: "" }); setIsEditingIns(null); } catch (e) { toast.error("Error saving."); } };
  const handleEditIns = (row) => { setInsForm({ company: row.company||"", type: row.type||"", actual_amount: row.actual_amount||"", bill_amount: row.bill_amount||"", start_date: row.start_date||"", end_date: row.end_date }); setIsEditingIns(row.id); };
  const handleDeleteIns = async (id) => { if(!confirm("Delete?")) return; try { await api.delete(`/api/insurances/${id}`); toast.success("Deleted"); fetchInsurances(selectedVehicle.id); } catch(e) { toast.error("Error."); } };

  const openPuccModal = (v) => { setSelectedVehicle(v); setPuccForm({ pucc_number: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" }); setIsEditingPucc(null); fetchPuccs(v.id); setShowPuccModal(true); };
  const handleSavePucc = async (e) => { e.preventDefault(); try { if(isEditingPucc) { await api.put(`/api/puccs/${isEditingPucc}`, puccForm); toast.success("Updated!"); } else { await api.post("/api/puccs", { ...puccForm, vehicle_id: selectedVehicle.id }); toast.success("Saved!"); } fetchPuccs(selectedVehicle.id); setPuccForm({ ...puccForm, valid_until: "", valid_from: "" }); setIsEditingPucc(null); } catch (e) { toast.error("Error saving."); } };
  const handleEditPucc = (row) => { setPuccForm({ pucc_number: row.pucc_number||"", actual_amount: row.actual_amount||"", bill_amount: row.bill_amount||"", valid_from: row.valid_from||"", valid_until: row.valid_until }); setIsEditingPucc(row.id); };
  const handleDeletePucc = async (id) => { if(!confirm("Delete?")) return; try { await api.delete(`/api/puccs/${id}`); toast.success("Deleted"); fetchPuccs(selectedVehicle.id); } catch(e) {} };

  const openFitModal = (v) => { setSelectedVehicle(v); setFitForm({ fitness_no: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" }); setIsEditingFit(null); fetchFitness(v.id); setShowFitModal(true); };
  const handleSaveFit = async (e) => { e.preventDefault(); try { if(isEditingFit) { await api.put(`/api/fitness/${isEditingFit}`, fitForm); toast.success("Updated!"); } else { await api.post("/api/fitness", { ...fitForm, vehicle_id: selectedVehicle.id }); toast.success("Saved!"); } fetchFitness(selectedVehicle.id); setFitForm({ ...fitForm, valid_until: "", valid_from: "" }); setIsEditingFit(null); } catch (e) { toast.error("Error saving."); } };
  const handleEditFit = (row) => { setFitForm({ fitness_no: row.fitness_no||"", actual_amount: row.actual_amount||"", bill_amount: row.bill_amount||"", valid_from: row.valid_from||"", valid_until: row.valid_until }); setIsEditingFit(row.id); };
  const handleDeleteFit = async (id) => { if(!confirm("Delete?")) return; try { await api.delete(`/api/fitness/${id}`); toast.success("Deleted"); fetchFitness(selectedVehicle.id); } catch(e) {} };

  const openVltdModal = (v) => { setSelectedVehicle(v); setVltdForm({ vendor_name: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" }); setIsEditingVltd(null); fetchVltds(v.id); setShowVltdModal(true); };
  const handleSaveVltd = async (e) => { e.preventDefault(); try { if(isEditingVltd) { await api.put(`/api/vltds/${isEditingVltd}`, vltdForm); toast.success("Updated!"); } else { await api.post("/api/vltds", { ...vltdForm, vehicle_id: selectedVehicle.id }); toast.success("Saved!"); } fetchVltds(selectedVehicle.id); setVltdForm({ ...vltdForm, valid_until: "", valid_from: "" }); setIsEditingVltd(null); } catch (e) { toast.error("Error saving."); } };
  const handleEditVltd = (row) => { setVltdForm({ vendor_name: row.vendor_name||"", actual_amount: row.actual_amount||"", bill_amount: row.bill_amount||"", valid_from: row.valid_from||"", valid_until: row.valid_until }); setIsEditingVltd(row.id); };
  const handleDeleteVltd = async (id) => { if(!confirm("Delete?")) return; try { await api.delete(`/api/vltds/${id}`); toast.success("Deleted"); fetchVltds(selectedVehicle.id); } catch(e) {} };

  const openPermitModal = (v) => { setSelectedVehicle(v); setPermitForm({ permit_number: "", permit_type: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" }); setIsEditingPermit(null); fetchPermits(v.id); setShowPermitModal(true); };
  const handleSavePermit = async (e) => { e.preventDefault(); try { if(isEditingPermit) { await api.put(`/api/permits/${isEditingPermit}`, permitForm); toast.success("Updated!"); } else { await api.post("/api/permits", { ...permitForm, vehicle_id: selectedVehicle.id }); toast.success("Saved!"); } fetchPermits(selectedVehicle.id); setPermitForm({ ...permitForm, valid_until: "", valid_from: "" }); setIsEditingPermit(null); } catch (e) { toast.error("Error"); } };
  const handleEditPermit = (row) => { setPermitForm({ permit_number: row.permit_number||"", permit_type: row.permit_type||"", actual_amount: row.actual_amount||"", bill_amount: row.bill_amount||"", valid_from: row.valid_from||"", valid_until: row.valid_until }); setIsEditingPermit(row.id); };
  const handleDeletePermit = async (id) => { if(!confirm("Delete?")) return; try { await api.delete(`/api/permits/${id}`); toast.success("Deleted"); fetchPermits(selectedVehicle.id); } catch(e) {} };

  const openSpdModal = (v) => { setSelectedVehicle(v); setSpdForm({ governor_number: "", actual_amount: "", bill_amount: "", valid_from: "", valid_until: "" }); setIsEditingSpd(null); fetchSpds(v.id); setShowSpdModal(true); };
  const handleSaveSpd = async (e) => { e.preventDefault(); try { if(isEditingSpd) { await api.put(`/api/speed-governors/${isEditingSpd}`, spdForm); toast.success("Updated!"); } else { await api.post("/api/speed-governors", { ...spdForm, vehicle_id: selectedVehicle.id }); toast.success("Saved!"); } fetchSpds(selectedVehicle.id); setSpdForm({ ...spdForm, valid_until: "", valid_from: "" }); setIsEditingSpd(null); } catch (e) { toast.error("Error"); } };
  const handleEditSpd = (row) => { setSpdForm({ governor_number: row.governor_number||"", actual_amount: row.actual_amount||"", bill_amount: row.bill_amount||"", valid_from: row.valid_from||"", valid_until: row.valid_until }); setIsEditingSpd(row.id); };
  const handleDeleteSpd = async (id) => { if(!confirm("Delete?")) return; try { await api.delete(`/api/speed-governors/${id}`); toast.success("Deleted"); fetchSpds(selectedVehicle.id); } catch(e) {} };

  const openPayModal = (record, type) => { setSelectedRecord(record); setPaymentType(type); const paid = record.payments.reduce((sum, p) => sum + Number(p.amount), 0); const balance = Number(record.bill_amount || 0) - paid; setPaymentForm({ amount: balance > 0 ? balance : "", payment_date: new Date().toISOString().split('T')[0], remarks: "" }); setShowPayModal(true); };
  const handleSavePayment = async (e) => { e.preventDefault(); const payload = { ...paymentForm }; if(paymentType === 'tax') payload.tax_id = selectedRecord.id; if(paymentType === 'insurance') payload.insurance_id = selectedRecord.id; if(paymentType === 'pucc') payload.pucc_id = selectedRecord.id; if(paymentType === 'fitness') payload.fitness_id = selectedRecord.id; if(paymentType === 'vltd') payload.vltd_id = selectedRecord.id; if(paymentType === 'permit') payload.permit_id = selectedRecord.id; if(paymentType === 'spd') payload.speed_governor_id = selectedRecord.id; try { await api.post("/api/payments", payload); toast.success("Payment Successful!"); setShowPayModal(false); if(paymentType === 'tax') fetchTaxes(selectedVehicle.id); if(paymentType === 'insurance') fetchInsurances(selectedVehicle.id); if(paymentType === 'pucc') fetchPuccs(selectedVehicle.id); if(paymentType === 'fitness') fetchFitness(selectedVehicle.id); if(paymentType === 'vltd') fetchVltds(selectedVehicle.id); if(paymentType === 'permit') fetchPermits(selectedVehicle.id); if(paymentType === 'spd') fetchSpds(selectedVehicle.id); } catch (e) { toast.error("Payment Error."); } };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="bg-light min-vh-100">
      <UserNavbar />
      <div className="container mt-4 pb-5">

        {/* HEADER CARD (Responsive) */}
        <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white p-3 p-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <h4 className="fw-bold text-primary mb-1 d-flex align-items-center">
                <i className="bi bi-person-circle me-2"></i>{citizen.name}
              </h4>
              <div className="text-muted small mt-1 d-flex flex-wrap gap-3">
                <span><i className="bi bi-phone me-1"></i> {citizen.mobile_number}</span>
                <span><i className="bi bi-geo-alt me-1"></i> {citizen.city_district || "No Location"}</span>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 w-100 w-md-auto">
              <button className="btn btn-primary btn-sm px-3 flex-grow-1 flex-md-grow-0" onClick={() => navigate(`/citizens/${id}/accounts`)}>
                <i className="bi bi-file-earmark-text me-1"></i> Accounts
              </button>

              {/* UPDATED: Add Vehicle Button clears previous edit state */}
              <button
                onClick={() => {
                    setEditingVehicleId(null);
                    setVehicleForm({ registration_no: "", type: "", make_model: "", chassis_no: "", engine_no: "" });
                    setShowModal(true);
                }}
                className="btn btn-success btn-sm px-3 flex-grow-1 flex-md-grow-0"
              >
                <i className="bi bi-plus-lg me-1"></i> Vehicle
              </button>

              <Link to={`/reports/expiry?citizen_id=${id}`} className="btn btn-warning btn-sm px-3 fw-bold text-dark flex-grow-1 flex-md-grow-0">
                Expiry Check
              </Link>
              <Link to="/citizens" className="btn btn-outline-secondary btn-sm px-3 flex-grow-1 flex-md-grow-0">
                 Back
              </Link>
            </div>
          </div>
        </div>

        {/* VEHICLE LIST TABLE (Responsive Scroll) */}
        <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white fw-bold py-3">
                <i className="bi bi-truck me-2 text-secondary"></i>Registered Vehicles
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-bordered table-hover mb-0 align-middle text-nowrap">
                        <thead className="table-light">
                            <tr>
                                <th style={{width: '50px'}}>#</th>
                                <th>Registration</th>
                                <th>Type</th>
                                <th>Make/Model</th>
                                <th>Chassis</th>
                                <th>Engine</th>
                                <th style={{minWidth: '550px'}}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {citizen.vehicles && citizen.vehicles.length > 0 ? (
                                citizen.vehicles.map((vehicle, index) => (
                                    <tr key={vehicle.id}>
                                        <td className="text-center text-muted">{index + 1}</td>
                                        <td className="fw-bold text-primary">{vehicle.registration_no}</td>
                                        <td>{vehicle.type || '-'}</td>
                                        <td>{vehicle.make_model || '-'}</td>
                                        <td>{vehicle.chassis_no || '-'}</td>
                                        <td>{vehicle.engine_no || '-'}</td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <button onClick={() => openTaxModal(vehicle)} className="btn btn-sm btn-outline-dark px-2 py-0 fw-semibold" style={{fontSize:'12px'}}>Taxes</button>
                                                <button onClick={() => openInsModal(vehicle)} className="btn btn-sm btn-outline-info px-2 py-0 fw-semibold" style={{fontSize:'12px'}}>Ins</button>
                                                <button onClick={() => openPuccModal(vehicle)} className="btn btn-sm btn-outline-success px-2 py-0 fw-semibold" style={{fontSize:'12px'}}>PUCC</button>
                                                <button onClick={() => openFitModal(vehicle)} className="btn btn-sm btn-outline-secondary px-2 py-0 fw-semibold" style={{fontSize:'12px'}}>Fit</button>
                                                <button onClick={() => openVltdModal(vehicle)} className="btn btn-sm btn-outline-secondary px-2 py-0 fw-semibold" style={{fontSize:'12px'}}>VLTd</button>
                                                <button onClick={() => openPermitModal(vehicle)} className="btn btn-sm btn-outline-secondary px-2 py-0 fw-semibold" style={{fontSize:'12px'}}>Permit</button>
                                                <button onClick={() => openSpdModal(vehicle)} className="btn btn-sm btn-outline-secondary px-2 py-0 fw-semibold" style={{fontSize:'12px'}}>Speed</button>
                                                <div className="vr mx-1"></div>

                                                {/* UPDATED: Buttons now linked to functions */}
                                                <button onClick={() => handleEditVehicle(vehicle)} className="btn btn-sm btn-light text-primary px-2 py-0" title="Edit"><i className="bi bi-pencil"></i></button>
                                                <button onClick={() => handleDeleteVehicle(vehicle.id)} className="btn btn-sm btn-light text-danger px-2 py-0" title="Delete"><i className="bi bi-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="7" className="text-center py-5 text-muted">No vehicles found. Click <strong>+ Add Vehicle</strong>.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

      </div>

      {/* 1. ADD/EDIT VEHICLE MODAL */}
      {showModal && (
        <div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-1 border-0 shadow-lg">
              <div className="modal-header py-2 border-bottom">
                <h5 className="modal-title fw-bold">{editingVehicleId ? "Edit Vehicle" : "Add New Vehicle"}</h5>
                <button className="btn-close" onClick={()=>setShowModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSaveVehicle}>
                  <div className="mb-3">
                    <label className="form-label text-muted small fw-bold">Registration No *</label>
                    <input
                        type="text"
                        className="form-control fw-bold"
                        value={vehicleForm.registration_no}
                        onChange={(e)=>setVehicleForm({...vehicleForm,registration_no:e.target.value.toUpperCase()})} // CAPS
                        required
                    />
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-bold">Type</label>
                      <select className="form-select" value={vehicleForm.type} onChange={(e)=>setVehicleForm({...vehicleForm,type:e.target.value})}>
                        <option value="">Select...</option>
                        {vehicleTypes.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-bold">Model</label>
                      <input
                        type="text"
                        className="form-control"
                        value={vehicleForm.make_model}
                        onChange={(e)=>setVehicleForm({...vehicleForm,make_model:e.target.value.toUpperCase()})} // CAPS
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-bold">Chassis No</label>
                      <input
                        type="text"
                        className="form-control"
                        value={vehicleForm.chassis_no}
                        onChange={(e)=>setVehicleForm({...vehicleForm,chassis_no:e.target.value.toUpperCase()})} // CAPS
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-bold">Engine No</label>
                      <input
                        type="text"
                        className="form-control"
                        value={vehicleForm.engine_no}
                        onChange={(e)=>setVehicleForm({...vehicleForm,engine_no:e.target.value.toUpperCase()})} // CAPS
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100">{editingVehicleId ? "Update Vehicle" : "Save Vehicle"}</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAX MODAL */}
      {showTaxModal && selectedVehicle && (<div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content rounded-1 border-0 shadow-lg"><div className="modal-header py-2"><h5 className="modal-title fw-bold">Manage Tax - {selectedVehicle.registration_no}</h5><button type="button" className="btn-close" onClick={()=>setShowTaxModal(false)}></button></div><div className="modal-body p-3"><div className="table-responsive border mb-4"><table className="table table-bordered mb-0 text-center align-middle" style={{fontSize:'13px'}}><thead className="table-light"><tr><th>Mode</th><th>From</th><th>Upto</th><th>Govt Fee</th><th>Bill</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead><tbody>{taxRecords.map(r=>{const p=r.payments?.reduce((s,x)=>s+Number(x.amount),0)||0;const b=Number(r.bill_amount||0)-p;return(<tr key={r.id}><td>{r.tax_mode}</td><td>{r.from_date||'-'}</td><td>{r.upto_date}</td><td>₹{r.govt_fee||0}</td><td>₹{r.bill_amount||0}</td><td className="text-success">₹{p}</td><td className="text-danger">₹{b}</td><td><div className="d-flex gap-1 justify-content-center">{b>0&&<button onClick={()=>openPayModal(r,'tax')} className="btn btn-success btn-sm px-2 py-0">Pay</button>}<button onClick={()=>handleEditTax(r)} className="btn btn-info btn-sm px-2 py-0 text-white">Edit</button><button onClick={()=>handleDeleteTax(r.id)} className="btn btn-danger btn-sm px-2 py-0">X</button></div></td></tr>)})}</tbody></table></div><h6 className="fw-bold text-primary mb-3">Add/Edit Tax</h6><form onSubmit={handleSaveTax}><div className="row g-2 mb-2"><div className="col-md-3"><select className="form-select form-select-sm" value={taxForm.tax_mode} onChange={(e)=>setTaxForm({...taxForm,tax_mode:e.target.value})}><option value="">Select...</option>{taxModes.map(m=><option key={m} value={m}>{m}</option>)}</select></div><div className="col-md-3"><input type="number" className="form-control form-select-sm" placeholder="Govt" value={taxForm.govt_fee} onChange={(e)=>setTaxForm({...taxForm,govt_fee:e.target.value})}/></div><div className="col-md-3"><input type="number" className="form-control form-select-sm" placeholder="Bill" value={taxForm.bill_amount} onChange={(e)=>setTaxForm({...taxForm,bill_amount:e.target.value})}/></div><div className="col-md-3"><input type="text" className="form-control form-select-sm" placeholder="Type" value={taxForm.type} onChange={(e)=>setTaxForm({...taxForm,type:e.target.value.toUpperCase()})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={taxForm.from_date} onChange={(e)=>setTaxForm({...taxForm,from_date:e.target.value})}/></div><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={taxForm.upto_date} onChange={(e)=>setTaxForm({...taxForm,upto_date:e.target.value})} required/></div></div><button type="submit" className="btn btn-success w-100 fw-bold">Save</button></form></div></div></div></div>)}

      {/* 3. INS MODAL */}
      {showInsModal && selectedVehicle && (<div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content rounded-1 border-0 shadow-lg"><div className="modal-header py-2"><h5 className="modal-title fw-bold">Manage Insurance</h5><button type="button" className="btn-close" onClick={()=>setShowInsModal(false)}></button></div><div className="modal-body p-3"><div className="table-responsive border mb-4"><table className="table table-bordered mb-0 text-center align-middle" style={{fontSize:'13px'}}><thead className="table-light"><tr><th>Company</th><th>Period</th><th>Bill</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead><tbody>{insRecords.map(r=>{const p=r.payments?.reduce((s,x)=>s+Number(x.amount),0)||0;const b=Number(r.bill_amount||0)-p;return(<tr key={r.id}><td>{r.company}</td><td>{r.start_date} to {r.end_date}</td><td>₹{r.bill_amount}</td><td className="text-success">₹{p}</td><td className="text-danger">₹{b}</td><td><div className="d-flex gap-1 justify-content-center">{b>0&&<button onClick={()=>openPayModal(r,'insurance')} className="btn btn-success btn-sm px-2 py-0">Pay</button>}<button onClick={()=>handleEditIns(r)} className="btn btn-info btn-sm px-2 py-0 text-white">Edit</button><button onClick={()=>handleDeleteIns(r.id)} className="btn btn-danger btn-sm px-2 py-0">X</button></div></td></tr>)})}</tbody></table></div><h6 className="fw-bold text-primary mb-3">Add/Edit Insurance</h6><form onSubmit={handleSaveIns}><div className="row g-2 mb-2"><div className="col-md-6"><input type="text" className="form-control form-select-sm" placeholder="Company" value={insForm.company} onChange={(e)=>setInsForm({...insForm,company:e.target.value.toUpperCase()})}/></div><div className="col-md-6"><select className="form-select form-select-sm" value={insForm.type} onChange={(e)=>setInsForm({...insForm,type:e.target.value})}><option value="">Select...</option>{insTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Actual" value={insForm.actual_amount} onChange={(e)=>setInsForm({...insForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Bill" value={insForm.bill_amount} onChange={(e)=>setInsForm({...insForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={insForm.start_date} onChange={(e)=>setInsForm({...insForm,start_date:e.target.value})}/></div><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={insForm.end_date} onChange={(e)=>setInsForm({...insForm,end_date:e.target.value})} required/></div></div><button type="submit" className="btn btn-success w-100 fw-bold">Save</button></form></div></div></div></div>)}

      {/* 4. PUCC MODAL */}
      {showPuccModal && selectedVehicle && (<div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content rounded-1 border-0 shadow-lg"><div className="modal-header py-2"><h5 className="modal-title fw-bold">Manage PUCC</h5><button type="button" className="btn-close" onClick={()=>setShowPuccModal(false)}></button></div><div className="modal-body p-3"><div className="table-responsive border mb-4"><table className="table table-bordered mb-0 text-center align-middle" style={{fontSize:'13px'}}><thead className="table-light"><tr><th>PUCC No</th><th>Expiry</th><th>Bill</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead><tbody>{puccRecords.map(r=>{const p=r.payments?.reduce((s,x)=>s+Number(x.amount),0)||0;const b=Number(r.bill_amount||0)-p;return(<tr key={r.id}><td>{r.pucc_number}</td><td>{r.valid_until}</td><td>₹{r.bill_amount}</td><td className="text-success">₹{p}</td><td className="text-danger">₹{b}</td><td><div className="d-flex gap-1 justify-content-center">{b>0&&<button onClick={()=>openPayModal(r,'pucc')} className="btn btn-success btn-sm px-2 py-0">Pay</button>}<button onClick={()=>handleEditPucc(r)} className="btn btn-info btn-sm px-2 py-0 text-white">Edit</button><button onClick={()=>handleDeletePucc(r.id)} className="btn btn-danger btn-sm px-2 py-0">X</button></div></td></tr>)})}</tbody></table></div><h6 className="fw-bold text-primary mb-3">Add/Edit PUCC</h6><form onSubmit={handleSavePucc}><div className="mb-2"><input type="text" className="form-control form-select-sm" placeholder="PUCC No" value={puccForm.pucc_number} onChange={(e)=>setPuccForm({...puccForm,pucc_number:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Actual" value={puccForm.actual_amount} onChange={(e)=>setPuccForm({...puccForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Bill" value={puccForm.bill_amount} onChange={(e)=>setPuccForm({...puccForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={puccForm.valid_from} onChange={(e)=>setPuccForm({...puccForm,valid_from:e.target.value})}/></div><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={puccForm.valid_until} onChange={(e)=>setPuccForm({...puccForm,valid_until:e.target.value})} required/></div></div><button type="submit" className="btn btn-success w-100 fw-bold">Save</button></form></div></div></div></div>)}

      {/* 5. FITNESS MODAL */}
      {showFitModal && selectedVehicle && (<div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content rounded-1 border-0 shadow-lg"><div className="modal-header py-2"><h5 className="modal-title fw-bold">Manage Fitness</h5><button type="button" className="btn-close" onClick={()=>setShowFitModal(false)}></button></div><div className="modal-body p-3"><div className="table-responsive border mb-4"><table className="table table-bordered mb-0 text-center align-middle" style={{fontSize:'13px'}}><thead className="table-light"><tr><th>Fit No</th><th>Expiry</th><th>Bill</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead><tbody>{fitRecords.map(r=>{const p=r.payments?.reduce((s,x)=>s+Number(x.amount),0)||0;const b=Number(r.bill_amount||0)-p;return(<tr key={r.id}><td>{r.fitness_no}</td><td>{r.valid_until}</td><td>₹{r.bill_amount}</td><td className="text-success">₹{p}</td><td className="text-danger">₹{b}</td><td><div className="d-flex gap-1 justify-content-center">{b>0&&<button onClick={()=>openPayModal(r,'fitness')} className="btn btn-success btn-sm px-2 py-0">Pay</button>}<button onClick={()=>handleEditFit(r)} className="btn btn-info btn-sm px-2 py-0 text-white">Edit</button><button onClick={()=>handleDeleteFit(r.id)} className="btn btn-danger btn-sm px-2 py-0">X</button></div></td></tr>)})}</tbody></table></div><h6 className="fw-bold text-primary mb-3">Add/Edit Fitness</h6><form onSubmit={handleSaveFit}><div className="mb-2"><input type="text" className="form-control form-select-sm" placeholder="Fit No" value={fitForm.fitness_no} onChange={(e)=>setFitForm({...fitForm,fitness_no:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Actual" value={fitForm.actual_amount} onChange={(e)=>setFitForm({...fitForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Bill" value={fitForm.bill_amount} onChange={(e)=>setFitForm({...fitForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={fitForm.valid_from} onChange={(e)=>setFitForm({...fitForm,valid_from:e.target.value})}/></div><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={fitForm.valid_until} onChange={(e)=>setFitForm({...fitForm,valid_until:e.target.value})} required/></div></div><button type="submit" className="btn btn-success w-100 fw-bold">Save</button></form></div></div></div></div>)}

      {/* 6. VLTD MODAL */}
      {showVltdModal && selectedVehicle && (<div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content rounded-1 border-0 shadow-lg"><div className="modal-header py-2"><h5 className="modal-title fw-bold">Manage VLTD</h5><button type="button" className="btn-close" onClick={()=>setShowVltdModal(false)}></button></div><div className="modal-body p-3"><div className="table-responsive border mb-4"><table className="table table-bordered mb-0 text-center align-middle" style={{fontSize:'13px'}}><thead className="table-light"><tr><th>Vendor</th><th>Expiry</th><th>Bill</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead><tbody>{vltdRecords.map(r=>{const p=r.payments?.reduce((s,x)=>s+Number(x.amount),0)||0;const b=Number(r.bill_amount||0)-p;return(<tr key={r.id}><td>{r.vendor_name}</td><td>{r.valid_until}</td><td>₹{r.bill_amount}</td><td className="text-success">₹{p}</td><td className="text-danger">₹{b}</td><td><div className="d-flex gap-1 justify-content-center">{b>0&&<button onClick={()=>openPayModal(r,'vltd')} className="btn btn-success btn-sm px-2 py-0">Pay</button>}<button onClick={()=>handleEditVltd(r)} className="btn btn-info btn-sm px-2 py-0 text-white">Edit</button><button onClick={()=>handleDeleteVltd(r.id)} className="btn btn-danger btn-sm px-2 py-0">X</button></div></td></tr>)})}</tbody></table></div><h6 className="fw-bold text-primary mb-3">Add/Edit VLTD</h6><form onSubmit={handleSaveVltd}><div className="mb-2"><input type="text" className="form-control form-select-sm" placeholder="Vendor" value={vltdForm.vendor_name} onChange={(e)=>setVltdForm({...vltdForm,vendor_name:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Actual" value={vltdForm.actual_amount} onChange={(e)=>setVltdForm({...vltdForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Bill" value={vltdForm.bill_amount} onChange={(e)=>setVltdForm({...vltdForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={vltdForm.valid_from} onChange={(e)=>setVltdForm({...vltdForm,valid_from:e.target.value})}/></div><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={vltdForm.valid_until} onChange={(e)=>setVltdForm({...vltdForm,valid_until:e.target.value})} required/></div></div><button type="submit" className="btn btn-success w-100 fw-bold">Save</button></form></div></div></div></div>)}

      {/* 7. PERMIT MODAL */}
       {showPermitModal && selectedVehicle && (<div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content rounded-1 border-0 shadow-lg"><div className="modal-header py-2"><h5 className="modal-title fw-bold">Manage Permit</h5><button type="button" className="btn-close" onClick={()=>setShowPermitModal(false)}></button></div><div className="modal-body p-3"><div className="table-responsive border mb-4"><table className="table table-bordered mb-0 text-center align-middle" style={{fontSize:'13px'}}><thead className="table-light"><tr><th>Permit No</th><th>Expiry</th><th>Bill</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead><tbody>{permitRecords.map(r=>{const p=r.payments?.reduce((s,x)=>s+Number(x.amount),0)||0;const b=Number(r.bill_amount||0)-p;return(<tr key={r.id}><td>{r.permit_number}</td><td>{r.valid_until}</td><td>₹{r.bill_amount}</td><td className="text-success">₹{p}</td><td className="text-danger">₹{b}</td><td><div className="d-flex gap-1 justify-content-center">{b>0&&<button onClick={()=>openPayModal(r,'permit')} className="btn btn-success btn-sm px-2 py-0">Pay</button>}<button onClick={()=>handleEditPermit(r)} className="btn btn-info btn-sm px-2 py-0 text-white">Edit</button><button onClick={()=>handleDeletePermit(r.id)} className="btn btn-danger btn-sm px-2 py-0">X</button></div></td></tr>)})}</tbody></table></div><h6 className="fw-bold text-primary mb-3">Add/Edit Permit</h6><form onSubmit={handleSavePermit}><div className="mb-2"><input type="text" className="form-control form-select-sm" placeholder="Permit No" value={permitForm.permit_number} onChange={(e)=>setPermitForm({...permitForm,permit_number:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Actual" value={permitForm.actual_amount} onChange={(e)=>setPermitForm({...permitForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Bill" value={permitForm.bill_amount} onChange={(e)=>setPermitForm({...permitForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={permitForm.valid_from} onChange={(e)=>setPermitForm({...permitForm,valid_from:e.target.value})}/></div><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={permitForm.valid_until} onChange={(e)=>setPermitForm({...permitForm,valid_until:e.target.value})} required/></div></div><button type="submit" className="btn btn-success w-100 fw-bold">Save</button></form></div></div></div></div>)}

      {/* 8. SPEED GOV MODAL */}
      {showSpdModal && selectedVehicle && (<div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content rounded-1 border-0 shadow-lg"><div className="modal-header py-2"><h5 className="modal-title fw-bold">Manage Speed Gov</h5><button type="button" className="btn-close" onClick={()=>setShowSpdModal(false)}></button></div><div className="modal-body p-3"><div className="table-responsive border mb-4"><table className="table table-bordered mb-0 text-center align-middle" style={{fontSize:'13px'}}><thead className="table-light"><tr><th>Gov No</th><th>Expiry</th><th>Bill</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead><tbody>{spdRecords.map(r=>{const p=r.payments?.reduce((s,x)=>s+Number(x.amount),0)||0;const b=Number(r.bill_amount||0)-p;return(<tr key={r.id}><td>{r.governor_number}</td><td>{r.valid_until}</td><td>₹{r.bill_amount}</td><td className="text-success">₹{p}</td><td className="text-danger">₹{b}</td><td><div className="d-flex gap-1 justify-content-center">{b>0&&<button onClick={()=>openPayModal(r,'spd')} className="btn btn-success btn-sm px-2 py-0">Pay</button>}<button onClick={()=>handleEditSpd(r)} className="btn btn-info btn-sm px-2 py-0 text-white">Edit</button><button onClick={()=>handleDeleteSpd(r.id)} className="btn btn-danger btn-sm px-2 py-0">X</button></div></td></tr>)})}</tbody></table></div><h6 className="fw-bold text-primary mb-3">Add/Edit Speed Gov</h6><form onSubmit={handleSaveSpd}><div className="mb-2"><input type="text" className="form-control form-select-sm" placeholder="Gov No" value={spdForm.governor_number} onChange={(e)=>setSpdForm({...spdForm,governor_number:e.target.value.toUpperCase()})}/></div><div className="row g-2 mb-2"><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Actual" value={spdForm.actual_amount} onChange={(e)=>setSpdForm({...spdForm,actual_amount:e.target.value})}/></div><div className="col-md-6"><input type="number" className="form-control form-select-sm" placeholder="Bill" value={spdForm.bill_amount} onChange={(e)=>setSpdForm({...spdForm,bill_amount:e.target.value})}/></div></div><div className="row g-2 mb-3"><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={spdForm.valid_from} onChange={(e)=>setSpdForm({...spdForm,valid_from:e.target.value})}/></div><div className="col-md-6"><input type="date" className="form-control form-select-sm" value={spdForm.valid_until} onChange={(e)=>setSpdForm({...spdForm,valid_until:e.target.value})} required/></div></div><button type="submit" className="btn btn-success w-100 fw-bold">Save</button></form></div></div></div></div>)}

      {/* 9. PAYMENT MODAL */}
     {showPayModal && (<div className="modal d-block" style={{backgroundColor:"rgba(0,0,0,0.5)"}}><div className="modal-dialog modal-sm modal-dialog-centered"><div className="modal-content border-0 shadow-lg"><div className="modal-header py-2"><h6 className="modal-title fw-bold">Add Payment</h6><button className="btn-close btn-sm" onClick={()=>setShowPayModal(false)}></button></div><div className="modal-body p-3"><form onSubmit={handleSavePayment}><div className="mb-2"><label className="small text-muted">Amount (₹)</label><input type="number" className="form-control form-control-sm fw-bold" value={paymentForm.amount} onChange={(e)=>setPaymentForm({...paymentForm,amount:e.target.value})} required /></div><div className="mb-2"><label className="small text-muted">Date</label><input type="date" className="form-control form-control-sm" value={paymentForm.payment_date} onChange={(e)=>setPaymentForm({...paymentForm,payment_date:e.target.value})} required /></div><div className="mb-3"><label className="small text-muted">Remarks</label><input type="text" className="form-control form-control-sm" value={paymentForm.remarks} onChange={(e)=>setPaymentForm({...paymentForm,remarks:e.target.value})} /></div><div className="d-flex gap-2"><button type="button" className="btn btn-secondary btn-sm w-50" onClick={()=>setShowPayModal(false)}>Cancel</button><button type="submit" className="btn btn-success btn-sm w-50">Save</button></div></form></div></div></div></div>)}


    </div>
  );
}
