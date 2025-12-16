<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Tax;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Validator;

class TaxController extends Controller
{
    // Helper to verify vehicle belongs to the Team (Boss + Staff)
    private function checkOwnership($vehicleId, $user)
    {
        $ownerId = $user->parent_id ?? $user->id; // Get Boss ID
        return Vehicle::where('id', $vehicleId)
            ->whereHas('citizen', fn($q) => $q->where('user_id', $ownerId))
            ->exists();
    }

    public function index(Request $request, $vehicleId)
    {
        if (!$this->checkOwnership($vehicleId, $request->user()))
            return response()->json(['message' => 'Unauthorized'], 403);

        return response()->json(Tax::where('vehicle_id', $vehicleId)->with('payments')->latest()->get());
    }

    public function store(Request $request)
    {
        if (!$this->checkOwnership($request->vehicle_id, $request->user()))
            return response()->json(['error' => 'Unauthorized'], 403);

        $validator = Validator::make($request->all(), [
            'vehicle_id' => 'required|exists:vehicles,id',
            'upto_date' => 'required|date'
        ]);

        if ($validator->fails())
            return response()->json(['errors' => $validator->errors()], 422);

        $data = $request->all();
        $data['tax_mode'] = $request->tax_mode ?: null;
        $data['from_date'] = $request->from_date ?: null;
        $data['govt_fee'] = $request->govt_fee !== "" ? $request->govt_fee : null;
        $data['bill_amount'] = $request->bill_amount !== "" ? $request->bill_amount : null;
        $data['type'] = $request->type ?: null;

        Tax::create($data);
        return response()->json(['message' => 'Saved']);
    }

    public function update(Request $request, $id)
    {
        $tax = Tax::findOrFail($id);

        if (!$this->checkOwnership($tax->vehicle_id, $request->user()))
            return response()->json(['error' => 'Unauthorized'], 403);

        $data = $request->all();
        $data['tax_mode'] = $request->tax_mode ?: null;
        $data['from_date'] = $request->from_date ?: null;
        $data['govt_fee'] = $request->govt_fee !== "" ? $request->govt_fee : null;
        $data['bill_amount'] = $request->bill_amount !== "" ? $request->bill_amount : null;
        $data['type'] = $request->type ?: null;

        $tax->update($data);
        return response()->json(['message' => 'Updated']);
    }

    public function destroy(Request $request, $id)
    {
        $tax = Tax::findOrFail($id);

        if (!$this->checkOwnership($tax->vehicle_id, $request->user()))
            return response()->json(['error' => 'Unauthorized'], 403);

        $tax->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
