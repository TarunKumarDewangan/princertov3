import React from "react";

export const ReceiptTemplate = React.forwardRef(({ data, selectedIds }, ref) => {
  if (!data || !data.statement) return null;

  // --- FIX: Filter by 'unique_key' instead of 'id' ---
  const itemsToPrint = data.statement.filter((item) => selectedIds.includes(item.unique_key));

  const totalBill = itemsToPrint.reduce((sum, item) => sum + Number(item.bill_amount), 0);
  const totalPaid = itemsToPrint.reduce((sum, item) => sum + Number(item.paid), 0);
  const totalDue = totalBill - totalPaid;

  return (
    <div ref={ref} className="p-5" style={{ width: "100%", backgroundColor: "white", color: "black", fontFamily: "Arial, sans-serif" }}>

      {/* Header */}
      <div className="d-flex justify-content-between border-bottom pb-3 mb-4">
        <div>
            <h2 className="fw-bold text-primary m-0">PRINCE RTO</h2>
            <p className="text-muted small">Parivahan Suvidha Kendra</p>
        </div>
        <div className="text-end">
            <h4 className="fw-bold m-0">STATEMENT</h4>
            <p className="small text-muted">Date: {new Date().toLocaleDateString("en-GB")}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-4">
        <h5 className="fw-bold mb-1">{data.citizen.name}</h5>
        <p className="mb-0">Mobile: {data.citizen.mobile_number}</p>
        <p className="mb-0">{data.citizen.city_district || ""}</p>
      </div>

      {/* Table */}
      <table className="table table-bordered border-dark mb-0" style={{fontSize: '14px'}}>
        <thead className="table-light">
            <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Service</th>
                <th className="text-end">Bill</th>
                <th className="text-end">Paid</th>
                <th className="text-end">Balance</th>
            </tr>
        </thead>
        <tbody>
          {itemsToPrint.map((item, i) => (
            <tr key={i}>
              <td>{new Date(item.date).toLocaleDateString("en-GB")}</td>
              <td className="fw-bold">{item.vehicle}</td>
              <td>{item.service}</td>
              <td className="text-end">₹{Number(item.bill_amount).toLocaleString()}</td>
              <td className="text-end">₹{Number(item.paid).toLocaleString()}</td>
              <td className="text-end fw-bold">₹{Number(item.balance).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="row justify-content-end mt-3">
        <div className="col-5">
          <table className="table table-sm table-borderless">
            <tbody>
              <tr><td className="text-end">Total Billed:</td><td className="text-end fw-bold">₹{totalBill.toLocaleString()}</td></tr>
              <tr><td className="text-end">Total Paid:</td><td className="text-end text-success fw-bold">₹{totalPaid.toLocaleString()}</td></tr>
              <tr className="border-top border-dark">
                  <td className="text-end fs-5 fw-bold">Balance Due:</td>
                  <td className="text-end fs-5 fw-bold text-danger">₹{totalDue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed-bottom p-5 text-center small text-muted" style={{position:'absolute', bottom:0, width:'100%'}}>
        <p>Computer Generated Receipt.</p>
      </div>
    </div>
  );
});
