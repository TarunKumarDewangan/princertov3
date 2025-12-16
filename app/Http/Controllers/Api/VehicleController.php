<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Vehicle;
use App\Models\Citizen;
use Illuminate\Support\Facades\Validator;

class VehicleController extends Controller
{
    // Helper to find vehicle belonging to Team (Boss + Staff)
    private function getVehicle($id, $user)
    {
        $ownerId = $user->parent_id ?? $user->id; // Get Boss ID
        return Vehicle::where('id', $id)->whereHas('citizen', fn($q) => $q->where('user_id', $ownerId))->first();
    }

    // Store (Allowed for Staff)
    public function store(Request $request)
    {
        $user = $request->user();
        $ownerId = $user->parent_id ?? $user->id; // Determine Owner

        // Verify Citizen belongs to Boss
        $isOwner = Citizen::where('id', $request->citizen_id)->where('user_id', $ownerId)->exists();
        if (!$isOwner) return response()->json(['message' => 'Unauthorized action.'], 403);

        // Check Duplicate
        $exists = Vehicle::where('registration_no', strtoupper($request->registration_no))
            ->whereHas('citizen', fn($q) => $q->where('user_id', $ownerId))
            ->exists();

        if ($exists) return response()->json(['errors' => ['registration_no' => ['Vehicle already exists.']]], 422);

        $vehicle = Vehicle::create([
            'citizen_id' => $request->citizen_id,
            'registration_no' => strtoupper($request->registration_no),
            'type' => $request->type,
            'make_model' => strtoupper($request->make_model),
            'chassis_no' => strtoupper($request->chassis_no),
            'engine_no' => strtoupper($request->engine_no),
        ]);

        return response()->json(['message' => 'Vehicle Added', 'vehicle' => $vehicle]);
    }

    // Update (Allowed for Staff)
    public function update(Request $request, $id)
    {
        $vehicle = $this->getVehicle($id, $request->user());
        if (!$vehicle) return response()->json(['message' => 'Unauthorized'], 403);

        $vehicle->update([
            'registration_no' => strtoupper($request->registration_no),
            'type' => $request->type,
            'make_model' => strtoupper($request->make_model),
            'chassis_no' => strtoupper($request->chassis_no),
            'engine_no' => strtoupper($request->engine_no),
        ]);

        return response()->json(['message' => 'Vehicle Updated']);
    }

    // Delete (ALLOWED for Staff)
    public function destroy(Request $request, $id)
    {
        // NO PERMISSION CHECK HERE -> Staff CAN delete

        $vehicle = $this->getVehicle($id, $request->user());

        if (!$vehicle) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $vehicle->delete();

        return response()->json(['message' => 'Vehicle Deleted']);
    }
}
