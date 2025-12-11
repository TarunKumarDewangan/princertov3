<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;

// Models
use App\Models\Citizen;
use App\Models\Vehicle;
use App\Models\Tax;
use App\Models\Insurance;
use App\Models\Fitness;
use App\Models\Permit;
use App\Models\Pucc;
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
        $data = Excel::toArray([], $request->file('file'))[0];

        // Remove Header Row (Row 1)
        if (count($data) > 0)
            array_shift($data);

        if (count($data) === 0)
            return response()->json(['message' => 'File is empty'], 400);

        DB::beginTransaction();
        $count = 0;
        $skipped = 0;

        try {
            foreach ($data as $row) {
                // Skip if first column is empty
                if (!isset($row[0]) || $row[0] === null)
                    continue;

                // --- 1. CITIZENS ---
                if ($request->type === 'citizens') {
                    // 0: Name, 1: Mobile, 2: Email, 3: DOB, 4: Rel Type, 5: Rel Name, 6: Address, 7: State, 8: City
                    Citizen::updateOrCreate(
                        ['user_id' => $user->id, 'mobile_number' => trim($row[1])],
                        [
                            'name' => strtoupper(trim($row[0])),
                            'email' => $row[2] ?? null,
                            'birth_date' => $this->transformDate($row[3]),
                            'relation_type' => $row[4] ?? null,
                            'relation_name' => $row[5] ?? null,
                            'address' => $row[6] ?? null,
                            'state' => $row[7] ?? null,
                            'city_district' => $row[8] ?? null,
                        ]
                    );
                    $count++;
                }

                // --- 2. VEHICLES ---
                elseif ($request->type === 'vehicles') {
                    // 0: Owner Mobile, 1: Reg No, 2: Type, 3: Make/Model, 4: Chassis, 5: Engine
                    $citizen = Citizen::where('user_id', $user->id)->where('mobile_number', trim($row[0]))->first();

                    if ($citizen) {
                        Vehicle::updateOrCreate(
                            ['registration_no' => strtoupper(trim($row[1]))],
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
                        $skipped++;
                    }
                }

                // --- 3. DOCUMENTS (Standard 7 Cols) ---
                elseif (in_array($request->type, ['tax', 'insurance', 'fitness', 'permit', 'pucc', 'vltd', 'speed_gov'])) {
                    // 0: Reg No, 1: Valid Upto, 2: From, 3: Actual, 4: Bill, 5: Detail1, 6: Detail2
                    $vehicle = Vehicle::where('registration_no', strtoupper(trim($row[0])))->whereHas('citizen', fn($q) => $q->where('user_id', $user->id))->first();

                    if ($vehicle) {
                        $expiryDate = $this->transformDate($row[1]);
                        $fromDate = $this->transformDate($row[2]);
                        $actual = $this->cleanAmount($row[3]);
                        $bill = $this->cleanAmount($row[4]);
                        $d1 = $row[5] ?? null;
                        $d2 = $row[6] ?? null;

                        if ($expiryDate) {
                            $base = ['vehicle_id' => $vehicle->id, 'actual_amount' => $actual, 'bill_amount' => $bill];
                            switch ($request->type) {
                                case 'tax':
                                    Tax::create(array_merge($base, ['upto_date' => $expiryDate, 'from_date' => $fromDate, 'govt_fee' => $actual, 'tax_mode' => $d1, 'type' => $d2]));
                                    break;
                                case 'insurance':
                                    Insurance::create(array_merge($base, ['end_date' => $expiryDate, 'start_date' => $fromDate, 'company' => $d1, 'type' => $d2]));
                                    break;
                                case 'fitness':
                                    Fitness::create(array_merge($base, ['valid_until' => $expiryDate, 'valid_from' => $fromDate, 'fitness_no' => $d1]));
                                    break;
                                case 'permit':
                                    Permit::create(array_merge($base, ['valid_until' => $expiryDate, 'valid_from' => $fromDate, 'permit_number' => $d1, 'permit_type' => $d2]));
                                    break;
                                case 'pucc':
                                    Pucc::create(array_merge($base, ['valid_until' => $expiryDate, 'valid_from' => $fromDate, 'pucc_number' => $d1]));
                                    break;
                                case 'vltd':
                                    Vltd::create(array_merge($base, ['valid_until' => $expiryDate, 'valid_from' => $fromDate, 'vendor_name' => $d1]));
                                    break;
                                case 'speed_gov':
                                    SpeedGovernor::create(array_merge($base, ['valid_until' => $expiryDate, 'valid_from' => $fromDate, 'governor_number' => $d1]));
                                    break;
                            }
                            $count++;
                        }
                    } else {
                        $skipped++;
                    }
                }

                // --- 4. CASH FLOW (Split Date & Time) ---
                elseif ($request->type === 'cash_flow') {
                    // 0: Date, 1: Time, 2: Account Name, 3: Type, 4: Amount, 5: Desc, 6: Mobile

                    // Merge Date+Time
                    $finalDateTime = $this->transformDate($row[0]) . ' ' . $this->transformTime($row[1]);

                    $accId = DB::table('ledger_accounts')->where('user_id', $user->id)->where('name', strtoupper(trim($row[2])))->value('id');
                    if (!$accId)
                        $accId = DB::table('ledger_accounts')->insertGetId(['user_id' => $user->id, 'name' => strtoupper(trim($row[2])), 'mobile' => $row[6] ?? null, 'created_at' => now(), 'updated_at' => now()]);

                    DB::table('ledger_entries')->insert([
                        'user_id' => $user->id,
                        'ledger_account_id' => $accId,
                        'entry_date' => $finalDateTime,
                        'txn_type' => strtoupper(trim($row[3])) === 'IN' ? 'IN' : 'OUT',
                        'amount' => $this->cleanAmount($row[4]),
                        'description' => $row[5] ?? null,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    $count++;
                }

                // --- 5. WORK BOOK (Split Date & Time) ---
                elseif ($request->type === 'work_book') {
                    // 0: Date, 1: Time, 2: Client, 3: Mobile, 4: Vehicle, 5: Work, 6: Bill, 7: Paid

                    // Merge Date+Time
                    $finalDateTime = $this->transformDate($row[0]) . ' ' . $this->transformTime($row[1]);

                    $clientId = DB::table('clients')->where('user_id', $user->id)->where('name', strtoupper(trim($row[2])))->value('id');
                    if (!$clientId)
                        $clientId = DB::table('clients')->insertGetId(['user_id' => $user->id, 'name' => strtoupper(trim($row[2])), 'mobile' => $row[3] ?? null, 'created_at' => now(), 'updated_at' => now()]);

                    DB::table('work_jobs')->insert([
                        'user_id' => $user->id,
                        'client_id' => $clientId,
                        'job_date' => $finalDateTime,
                        'vehicle_no' => $row[4] ? strtoupper($row[4]) : null,
                        'description' => strtoupper($row[5]),
                        'bill_amount' => $this->cleanAmount($row[6]),
                        'paid_amount' => $this->cleanAmount($row[7]),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    $count++;
                }

                // --- 6. LICENSES ---
                elseif ($request->type === 'licenses') {
                    // 0: Name, 1: Mobile, 2: DOB, 3: App No, 4: LL No, 5: LL Status, 6: DL No, 7: DL Status
                    DB::table('licenses')->insert([
                        'user_id' => $user->id,
                        'applicant_name' => strtoupper(trim($row[0])),
                        'mobile_number' => $row[1],
                        'dob' => $this->transformDate($row[2]),
                        'application_no' => $row[3] ?? null,
                        'll_number' => $row[4] ?? null,
                        'll_status' => $row[5] ?? 'Form Complete',
                        'dl_number' => $row[6] ?? null,
                        'dl_status' => $row[7] ?? null,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    $count++;
                }
            }

            DB::commit();
            return response()->json(['message' => "Success! Imported: $count. Skipped: $skipped."]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Import Error: ' . $e->getMessage()], 500);
        }
    }

    // Helper: Date (Y-m-d)
    private function transformDate($value)
    {
        if (!$value)
            return now()->format('Y-m-d');
        try {
            if (is_numeric($value))
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d');
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return now()->format('Y-m-d');
        }
    }

    // Helper: Time (H:i:s)
    private function transformTime($value)
    {
        if (!$value)
            return '00:00:00';
        try {
            if (is_numeric($value))
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('H:i:s');
            // Handle '11.55 AM'
            $value = str_replace('.', ':', $value);
            return Carbon::parse($value)->format('H:i:s');
        } catch (\Exception $e) {
            return '00:00:00';
        }
    }

    // Helper: Money
    private function cleanAmount($value)
    {
        if (!$value)
            return 0;
        return (float) str_replace([',', ' '], '', $value);
    }
}
