<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Citizen;
use Illuminate\Support\Facades\Validator;

class CitizenController extends Controller
{
    /**
     * Get list of citizens.
     * SUBORDINATE LOGIC: If I am staff, I see my Boss's data.
     */
    public function index(Request $request)
    {
        $userId = $request->user()->getOwnerId(); // <--- MAGIC HELPER

        $citizens = Citizen::where('user_id', $userId)
            ->withCount('vehicles')
            ->latest()
            ->get();

        return response()->json($citizens);
    }

    /**
     * Store a new citizen.
     * PERMISSION: Only Boss can add.
     */
    public function store(Request $request)
    {
        // 1. Permission Check
        if ($request->user()->isSubordinate()) {
            return response()->json(['message' => 'Permission Denied: Staff cannot add data.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'mobile_number' => 'required|string|max:15',
            'email' => 'nullable|email',
            'birth_date' => 'nullable|date',
            'relation_type' => 'nullable|string',
            'relation_name' => 'nullable|string',
            'state' => 'nullable|string',
            'city_district' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $citizen = Citizen::create([
            'user_id' => $request->user()->id, // Saved under Boss's ID
            'name' => $request->name,
            'mobile_number' => $request->mobile_number,
            'email' => $request->email,
            'birth_date' => $request->birth_date ? $request->birth_date : null,
            'relation_type' => $request->relation_type,
            'relation_name' => $request->relation_name,
            'address' => $request->address,
            'state' => $request->state,
            'city_district' => $request->city_district,
        ]);

        return response()->json(['message' => 'Citizen Registered Successfully', 'citizen' => $citizen]);
    }

    /**
     * View Citizen Details.
     */
    public function show(Request $request, $id)
    {
        $userId = $request->user()->getOwnerId(); // Allow staff to view

        $citizen = Citizen::where('id', $id)
            ->where('user_id', $userId)
            ->with([
                'vehicles.latestTax',
                'vehicles.latestInsurance',
                'vehicles.latestPucc',
                'vehicles.latestFitness',
                'vehicles.latestVltd',
                'vehicles.latestPermit',
                'vehicles.latestSpeedGovernor'
            ])
            ->first();

        if (!$citizen) {
            return response()->json(['message' => 'Citizen not found'], 404);
        }

        return response()->json($citizen);
    }

    /**
     * Update Citizen.
     * PERMISSION: Only Boss.
     */
    public function update(Request $request, $id)
    {
        if ($request->user()->isSubordinate()) {
            return response()->json(['message' => 'Permission Denied: Staff cannot edit.'], 403);
        }

        $userId = $request->user()->id;
        $citizen = Citizen::where('id', $id)->where('user_id', $userId)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'mobile_number' => 'required|string',
            'email' => 'nullable|email',
            'birth_date' => 'nullable|date',
        ]);

        if ($validator->fails())
            return response()->json(['errors' => $validator->errors()], 422);

        $data = $request->all();
        $data['birth_date'] = $request->birth_date ?: null;

        $citizen->update($data);

        return response()->json(['message' => 'Citizen Updated Successfully']);
    }

    /**
     * Delete Citizen.
     * PERMISSION: Only Boss.
     */
    public function destroy(Request $request, $id)
    {
        if ($request->user()->isSubordinate()) {
            return response()->json(['message' => 'Permission Denied: Staff cannot delete.'], 403);
        }

        $citizen = Citizen::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
        $citizen->delete();

        return response()->json(['message' => 'Citizen Deleted']);
    }
}
