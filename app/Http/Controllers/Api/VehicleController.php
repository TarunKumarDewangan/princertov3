<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Validator;
use App\Models\Citizen;

class VehicleController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();

        // 1. Security: Ensure the Citizen belongs to this User
        $isOwner = Citizen::where('id', $request->citizen_id)
            ->where('user_id', $user->id)
            ->exists();

        if (!$isOwner) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        // 2. Check: Has this user already added this Vehicle No?
        $exists = Vehicle::where('registration_no', $request->registration_no)
            ->whereHas('citizen', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->exists();

        if ($exists) {
            return response()->json([
                'errors' => ['registration_no' => ['You have already added this Vehicle Number.']]
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'citizen_id' => 'required|exists:citizens,id',
            'registration_no' => 'required|string',
            'type' => 'nullable|string',
            'make_model' => 'nullable|string',
            'chassis_no' => 'nullable|string',
            'engine_no' => 'nullable|string',
        ]);

        if ($validator->fails())
            return response()->json(['errors' => $validator->errors()], 422);

        $vehicle = Vehicle::create($request->all());

        return response()->json(['message' => 'Vehicle Added Successfully', 'vehicle' => $vehicle]);
    }

    public function update(Request $request, $id)
    {
        $vehicle = Vehicle::with('citizen')->findOrFail($id);

        if (!$this->checkOwnership($vehicle)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'registration_no' => 'required|string',
            'type' => 'nullable|string',
            'make_model' => 'nullable|string',
            'chassis_no' => 'nullable|string',
            'engine_no' => 'nullable|string',
        ]);

        if ($validator->fails())
            return response()->json(['errors' => $validator->errors()], 422);

        $vehicle->update($request->all());

        return response()->json(['message' => 'Vehicle Updated Successfully']);
    }

    public function destroy($id)
    {
        $vehicle = Vehicle::with('citizen')->findOrFail($id);

        if (!$this->checkOwnership($vehicle)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $vehicle->delete();

        return response()->json(['message' => 'Vehicle Deleted Successfully']);
    }
}
