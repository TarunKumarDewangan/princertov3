<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Permit;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Validator;

class PermitController extends Controller
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

        return response()->json(Permit::where('vehicle_id', $vehicleId)->with('payments')->latest()->get());
    }

    public function store(Request $request)
    {
        if (!$this->checkOwnership($request->vehicle_id, $request->user()))
            return response()->json(['message' => 'Unauthorized'], 403);

        $validator = Validator::make($request->all(), [
            'vehicle_id' => 'required|exists:vehicles,id',
            'valid_until' => 'required|date'
        ]);

        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $data = $request->all();
        $data['valid_from'] = $request->valid_from ?: null;
        $data['actual_amount'] = $request->actual_amount !== "" ? $request->actual_amount : null;
        $data['bill_amount'] = $request->bill_amount !== "" ? $request->bill_amount : null;
        $data['permit_number'] = $request->permit_number ?: null;
        $data['permit_type'] = $request->permit_type ?: null;

        $permit = Permit::create($data);
        return response()->json(['message' => 'Saved', 'data' => $permit]);
    }

    public function update(Request $request, $id)
    {
        $permit = Permit::findOrFail($id);

        if (!$this->checkOwnership($permit->vehicle_id, $request->user()))
            return response()->json(['message' => 'Unauthorized'], 403);

        $data = $request->all();
        $data['valid_from'] = $request->valid_from ?: null;
        $data['actual_amount'] = $request->actual_amount !== "" ? $request->actual_amount : null;
        $data['bill_amount'] = $request->bill_amount !== "" ? $request->bill_amount : null;
        $data['permit_number'] = $request->permit_number ?: null;
        $data['permit_type'] = $request->permit_type ?: null;

        $permit->update($data);
        return response()->json(['message' => 'Updated']);
    }

    public function destroy(Request $request, $id)
    {
        $permit = Permit::findOrFail($id);

        if (!$this->checkOwnership($permit->vehicle_id, $request->user()))
            return response()->json(['message' => 'Unauthorized'], 403);

        $permit->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
