<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Citizen;
use Illuminate\Support\Facades\Validator;

class CitizenController extends Controller
{
    // 1. List (Visible to All)
    public function index(Request $request)
    {
        $userId = $request->user()->getOwnerId(); // Get Boss ID

        $citizens = Citizen::where('user_id', $userId)
            ->withCount('vehicles')
            ->latest()
            ->get();

        return response()->json($citizens);
    }

    // 2. Store (ALLOWED for Staff - Saves to Boss's ID)
    public function store(Request $request)
    {
        // NO PERMISSION CHECK HERE -> Staff CAN add

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

        // Determine Owner: If I am Staff, save to my Boss. If I am Boss, save to Me.
        $ownerId = $request->user()->parent_id ?? $request->user()->id;

        $citizen = Citizen::create([
            'user_id' => $ownerId, // <--- SAVES TO BOSS ACCOUNT
            'name' => strtoupper($request->name),
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

    // 3. Show (Visible to All)
    public function show(Request $request, $id)
    {
        $userId = $request->user()->getOwnerId();

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

        if (!$citizen)
            return response()->json(['message' => 'Citizen not found'], 404);

        return response()->json($citizen);
    }

    // 4. Update (ALLOWED for Staff)
    public function update(Request $request, $id)
    {
        // NO PERMISSION CHECK HERE -> Staff CAN edit

        $userId = $request->user()->getOwnerId(); // Check against Boss ID
        $citizen = Citizen::where('id', $id)->where('user_id', $userId)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name' => 'required',
            'mobile_number' => 'required',
        ]);

        if ($validator->fails())
            return response()->json(['errors' => $validator->errors()], 422);

        $data = $request->all();
        if (isset($data['name']))
            $data['name'] = strtoupper($data['name']);
        $data['birth_date'] = $request->birth_date ?: null;

        $citizen->update($data);

        return response()->json(['message' => 'Citizen Updated Successfully']);
    }

    // 5. Destroy (ALLOWED for Staff)
    public function destroy(Request $request, $id)
    {
        // NO PERMISSION CHECK HERE -> Staff CAN delete

        $userId = $request->user()->getOwnerId(); // Check against Boss ID
        $citizen = Citizen::where('id', $id)->where('user_id', $userId)->firstOrFail();
        $citizen->delete();

        return response()->json(['message' => 'Citizen Deleted']);
    }
}
