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
        $data = Excel::toArray([], $request->file('file'))[0];

        if (count($data) > 0)
            array_shift($data); // Remove Header

        if (count($data) === 0)
            return response()->json(['message' => 'File is empty'], 400);

        DB::beginTransaction();
        $count = 0;
        $skipped = 0;

        try {
            foreach ($data as $row) {
                if (!isset($row[0]) || empty($row[0]))
                    continue;

                // --- 1. EXISTING RTO IMPORTS ---
                if (in_array($request->type, ['citizens', 'vehicles', 'tax', 'pucc', 'insurance', 'fitness', 'permit', 'vltd', 'speed_gov'])) {
                    // (Keep your existing RTO logic here - omitted for brevity, paste it back from previous code)
                    // ... [Existing Logic] ...
                }

                // --- 4. CASH FLOW (Ledger Accounts & Entries) ---
                elseif ($request->type === 'cash_flow') {
                    // Col A: Account Name, Col B: Date, Col C: Type (IN/OUT), Col D: Amount, Col E: Description

                    // Find or Create Account
                    $accId = DB::table('ledger_accounts')->where('user_id', $user->id)->where('name', strtoupper(trim($row[0])))->value('id');

                    if (!$accId) {
                        $accId = DB::table('ledger_accounts')->insertGetId([
                            'user_id' => $user->id,
                            'name' => strtoupper(trim($row[0])),
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }

                    DB::table('ledger_entries')->insert([
                        'user_id' => $user->id,
                        'ledger_account_id' => $accId,
                        'entry_date' => $this->transformDate($row[1]),
                        'txn_type' => strtoupper(trim($row[2])) === 'IN' ? 'IN' : 'OUT',
                        'amount' => $row[3],
                        'description' => $row[4] ?? null,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    $count++;
                }

                // --- 5. WORK BOOK (Clients & Jobs) ---
                elseif ($request->type === 'work_book') {
                    // Col A: Client Name, Col B: Mobile, Col C: Date, Col D: Vehicle, Col E: Work, Col F: Bill, Col G: Paid

                    // Find or Create Client
                    $clientId = DB::table('clients')->where('user_id', $user->id)->where('name', strtoupper(trim($row[0])))->value('id');

                    if (!$clientId) {
                        $clientId = DB::table('clients')->insertGetId([
                            'user_id' => $user->id,
                            'name' => strtoupper(trim($row[0])),
                            'mobile' => $row[1] ?? null,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }

                    DB::table('work_jobs')->insert([
                        'user_id' => $user->id,
                        'client_id' => $clientId,
                        'job_date' => $this->transformDate($row[2]),
                        'vehicle_no' => $row[3] ? strtoupper($row[3]) : null,
                        'description' => strtoupper($row[4]),
                        'bill_amount' => $row[5] ?? 0,
                        'paid_amount' => $row[6] ?? 0,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    $count++;
                }

                // --- 6. LICENSE FLOW (LL / DL) ---
                elseif ($request->type === 'licenses') {
                    // Col A: Name, B: Mobile, C: DOB, D: LL No, E: DL No, F: LL Status, G: DL Status

                    DB::table('licenses')->insert([
                        'user_id' => $user->id,
                        'applicant_name' => strtoupper(trim($row[0])),
                        'mobile_number' => $row[1],
                        'dob' => $this->transformDate($row[2]),
                        'll_number' => $row[3] ?? null,
                        'dl_number' => $row[4] ?? null,
                        'll_status' => $row[5] ?? 'Form Complete',
                        'dl_status' => $row[6] ?? null,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    $count++;
                }
            }

            DB::commit();
            return response()->json(['message' => "Imported: $count. Skipped: $skipped."]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    private function transformDate($value)
    {
        if (!$value)
            return now()->format('Y-m-d'); // Default to today if missing
        try {
            if (is_numeric($value))
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d');
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return now()->format('Y-m-d');
        }
    }
}
