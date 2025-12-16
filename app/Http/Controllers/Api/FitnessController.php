<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Fitness;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Validator;

class FitnessController extends Controller
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

        return response()->json(Fitness::where('vehicle_id', $vehicleId)->with('payments')->latest()->get());
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
        $data['fitness_no'] = $request->fitness_no ?: null;

        $fit = Fitness::create($data);
        return response()->json(['message' => 'Fitness Saved', 'data' => $fit]);
    }

    public function update(Request $request, $id)
    {
        $fit = Fitness::findOrFail($id);

        if (!$this->checkOwnership($fit->vehicle_id, $request->user()))
            return response()->json(['message' => 'Unauthorized'], 403);

        $data = $request->all();
        $data['valid_from'] = $request->valid_from ?: null;
        $data['actual_amount'] = $request->actual_amount !== "" ? $request->actual_amount : null;
        $data['bill_amount'] = $request->bill_amount !== "" ? $request->bill_amount : null;
        $data['fitness_no'] = $request->fitness_no ?: null;

        $fit->update($data);
        return response()->json(['message' => 'Updated']);
    }

    public function destroy(Request $request, $id)
    {
        $fit = Fitness::findOrFail($id);

        if (!$this->checkOwnership($fit->vehicle_id, $request->user()))
            return response()->json(['message' => 'Unauthorized'], 403);

        $fit->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
