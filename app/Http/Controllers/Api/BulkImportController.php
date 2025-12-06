<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;
use App\Models\Citizen;
use App\Models\Vehicle;
use App\Models\Tax;
use App\Models\Pucc;
use App\Models\Insurance;
use App\Models\Fitness;
use App\Models\Permit;
use App\Models\Vltd;
use App\Models\SpeedGovernor;

class BulkImportController extends Controller
{
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv',
            'type' => 'required'
        ]);

        $user = $request->user();

        // Load Excel Data
        $data = Excel::toArray([], $request->file('file'))[0];

        // Remove Header Row (Assuming Row 1 is headers)
        if (count($data) > 0)
            array_shift($data);

        if (count($data) === 0)
            return response()->json(['message' => 'File is empty'], 400);

        DB::beginTransaction();
        $count = 0;
        $errors = 0;

        try {
            foreach ($data as $row) {
                // Skip if first column is empty
                if (!isset($row[0]) || empty($row[0]))
                    continue;

                // --- 1. CITIZENS ---
                if ($request->type === 'citizens') {
                    // Col 0: Name, Col 1: Mobile, Col 2: Address, Col 3: State, Col 4: City
                    Citizen::updateOrCreate(
                        ['user_id' => $user->id, 'mobile_number' => trim($row[1])], // Unique Check
                        [
                            'name' => strtoupper(trim($row[0])),
                            'address' => $row[2] ?? null,
                            'state' => $row[3] ?? null,
                            'city_district' => $row[4] ?? null,
                        ]
                    );
                    $count++;
                }

                // --- 2. VEHICLES ---
                elseif ($request->type === 'vehicles') {
                    // Col 0: Owner Mobile, Col 1: Reg No, Col 2: Type, Col 3: Model, Col 4: Chassis, Col 5: Engine

                    // Find Owner
                    $citizen = Citizen::where('user_id', $user->id)->where('mobile_number', trim($row[0]))->first();

                    if ($citizen) {
                        Vehicle::firstOrCreate(
                            ['registration_no' => strtoupper(trim($row[1]))], // Unique Check
                            [
                                'citizen_id' => $citizen->id,
                                'type' => $row[2] ?? null,
                                'make_model' => $row[3] ?? null,
                                'chassis_no' => $row[4] ?? null,
                                'engine_no' => $row[5] ?? null,
                            ]
                        );
                        $count++;
                    } else {
                        $errors++; // Owner not found
                    }
                }

                // --- 3. DOCUMENTS (Dynamic) ---
                else {
                    // Col 0: Reg No, Col 1: Expiry Date, Col 2: Amount, Col 3: Start Date, Col 4: Info/Mode

                    $vehicle = Vehicle::where('registration_no', strtoupper(trim($row[0])))
                        ->whereHas('citizen', fn($q) => $q->where('user_id', $user->id))
                        ->first();

                    if ($vehicle) {
                        $expiryDate = $this->transformDate($row[1]);
                        $amount = is_numeric($row[2]) ? $row[2] : null;
                        $startDate = isset($row[3]) ? $this->transformDate($row[3]) : null;
                        $info = $row[4] ?? null;

                        if ($expiryDate) {
                            switch ($request->type) {
                                case 'tax':
                                    Tax::create(['vehicle_id' => $vehicle->id, 'upto_date' => $expiryDate, 'from_date' => $startDate, 'bill_amount' => $amount, 'tax_mode' => $info]);
                                    break;
                                case 'pucc':
                                    Pucc::create(['vehicle_id' => $vehicle->id, 'valid_until' => $expiryDate, 'valid_from' => $startDate, 'bill_amount' => $amount, 'pucc_number' => $info]);
                                    break;
                                case 'insurance':
                                    Insurance::create(['vehicle_id' => $vehicle->id, 'end_date' => $expiryDate, 'start_date' => $startDate, 'bill_amount' => $amount, 'company' => $info]);
                                    break;
                                case 'fitness':
                                    Fitness::create(['vehicle_id' => $vehicle->id, 'valid_until' => $expiryDate, 'valid_from' => $startDate, 'bill_amount' => $amount]);
                                    break;
                                case 'permit':
                                    Permit::create(['vehicle_id' => $vehicle->id, 'valid_until' => $expiryDate, 'valid_from' => $startDate, 'bill_amount' => $amount, 'permit_type' => $info]);
                                    break;
                                case 'vltd':
                                    Vltd::create(['vehicle_id' => $vehicle->id, 'valid_until' => $expiryDate, 'valid_from' => $startDate, 'bill_amount' => $amount, 'vendor_name' => $info]);
                                    break;
                                case 'speed_gov':
                                    SpeedGovernor::create(['vehicle_id' => $vehicle->id, 'valid_until' => $expiryDate, 'valid_from' => $startDate, 'bill_amount' => $amount]);
                                    break;
                            }
                            $count++;
                        }
                    } else {
                        $errors++; // Vehicle not found
                    }
                }
            }

            DB::commit();
            return response()->json([
                'message' => "Process Complete. Imported: $count. Skipped/Error: $errors (usually due to missing Parent data)."
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Import Error: ' . $e->getMessage()], 500);
        }
    }

    // Helper to handle Excel Date Serials (e.g. 45201) and String Dates
    private function transformDate($value)
    {
        if (!$value)
            return null;
        try {
            // Check if it's an Excel numeric date
            if (is_numeric($value)) {
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d');
            }
            // Try standard parsing
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }
}
