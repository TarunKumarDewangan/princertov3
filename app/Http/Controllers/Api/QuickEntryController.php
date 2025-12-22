<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Citizen;
use App\Models\Vehicle;
use App\Models\Pucc;

class QuickEntryController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'mobile_number' => 'required',
            'registration_no' => 'required',
            'valid_until' => 'required|date',
        ]);

        // 1. Get Boss ID (Owner of data)
        $ownerId = $request->user()->parent_id ?? $request->user()->id;

        // Clean Inputs
        $mobile = trim($request->mobile_number);
        $regNo = strtoupper(str_replace(' ', '', trim($request->registration_no))); // Remove spaces from Reg No
        $name = strtoupper(trim($request->name));

        DB::beginTransaction();
        try {
            // --- 2. Find or Create Citizen ---
            // We check by Mobile AND User ID to prevent duplicates
            $citizen = Citizen::where('mobile_number', $mobile)->where('user_id', $ownerId)->first();

            if (!$citizen) {
                $citizen = Citizen::create([
                    'user_id' => $ownerId,
                    'name' => $name,
                    'mobile_number' => $mobile,
                ]);
            }

            // --- 3. Find or Create Vehicle ---
            $vehicle = Vehicle::where('registration_no', $regNo)->first();

            if ($vehicle) {
                // Vehicle Exists: Update the owner to this Citizen
                $vehicle->update(['citizen_id' => $citizen->id]);
            } else {
                // Create New Vehicle
                $vehicle = Vehicle::create([
                    'citizen_id' => $citizen->id,
                    'registration_no' => $regNo,
                    'type' => 'N/A'
                ]);
            }

            // --- 4. Create PUCC Entry ---
            Pucc::create([
                'vehicle_id' => $vehicle->id,
                'valid_from' => $request->valid_from,
                'valid_until' => $request->valid_until,
                'pucc_number' => null,
                'bill_amount' => 0,
                'actual_amount' => 0,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::commit();
            return response()->json(['message' => 'Entry Saved & Linked Successfully!']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }
}
