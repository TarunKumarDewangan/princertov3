<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use App\Models\Vehicle; // Import Vehicle Model
use ZipArchive;

class BackupController extends Controller
{
    public function getDownloadLink(Request $request)
    {
        $url = URL::signedRoute('backup.download', [
            'include' => $request->query('include'),
            'user_id' => $request->user()->id
        ], now()->addMinutes(10)); // Increased time for large files

        return response()->json(['url' => $url]);
    }

    public function export(Request $request)
    {
        if (!class_exists('ZipArchive')) {
            return response()->json(['error' => 'PHP ZipArchive extension missing.'], 500);
        }

        if (!$request->hasValidSignature()) {
            abort(403);
        }

        // Increase memory for large exports
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', 300);

        $userId = $request->query('user_id');
        $selections = explode(',', $request->query('include'));
        $zipFileName = 'PrinceRTO_Backup_' . date('Y-m-d_H-i') . '.zip';
        $zipPath = public_path($zipFileName);

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {

            // ==========================================
            // 1. MASTER COMBINED RECORD (FULL DATA)
            // ==========================================
            if (in_array('master', $selections)) {

                // Fetch Vehicles with ALL latest documents
                $vehicles = Vehicle::with([
                    'citizen',
                    'latestTax',
                    'latestInsurance',
                    'latestFitness',
                    'latestPermit',
                    'latestPucc',
                    'latestVltd',
                    'latestSpeedGovernor'
                ])
                    ->whereHas('citizen', fn($q) => $q->where('user_id', $userId))
                    ->get();

                $masterData = [];

                foreach ($vehicles as $v) {
                    $masterData[] = [
                        // --- VEHICLE & OWNER ---
                        'Owner Name' => $v->citizen->name,
                        'Mobile' => $v->citizen->mobile_number,
                        'Address' => $v->citizen->address,
                        'Reg No' => $v->registration_no,
                        'Class' => $v->type,
                        'Make/Model' => $v->make_model,
                        'Chassis No' => $v->chassis_no,
                        'Engine No' => $v->engine_no,

                        // --- TAX ---
                        'Tax Mode' => $v->latestTax->tax_mode ?? '',
                        'Tax Govt Fee' => $v->latestTax->govt_fee ?? '',
                        'Tax Bill' => $v->latestTax->bill_amount ?? '',
                        'Tax From' => $v->latestTax->from_date ?? '',
                        'Tax Upto' => $v->latestTax->upto_date ?? '',

                        // --- INSURANCE ---
                        'Ins Company' => $v->latestInsurance->company ?? '',
                        'Ins Type' => $v->latestInsurance->type ?? '',
                        'Ins Actual' => $v->latestInsurance->actual_amount ?? '',
                        'Ins Bill' => $v->latestInsurance->bill_amount ?? '',
                        'Ins Start' => $v->latestInsurance->start_date ?? '',
                        'Ins End' => $v->latestInsurance->end_date ?? '',

                        // --- FITNESS ---
                        'Fit No' => $v->latestFitness->fitness_no ?? '',
                        'Fit Actual' => $v->latestFitness->actual_amount ?? '',
                        'Fit Bill' => $v->latestFitness->bill_amount ?? '',
                        'Fit Start' => $v->latestFitness->valid_from ?? '',
                        'Fit End' => $v->latestFitness->valid_until ?? '',

                        // --- PERMIT ---
                        'Permit No' => $v->latestPermit->permit_number ?? '',
                        'Permit Type' => $v->latestPermit->permit_type ?? '',
                        'Permit Actual' => $v->latestPermit->actual_amount ?? '',
                        'Permit Bill' => $v->latestPermit->bill_amount ?? '',
                        'Permit Start' => $v->latestPermit->valid_from ?? '',
                        'Permit End' => $v->latestPermit->valid_until ?? '',

                        // --- PUCC ---
                        'PUCC No' => $v->latestPucc->pucc_number ?? '',
                        'PUCC Actual' => $v->latestPucc->actual_amount ?? '',
                        'PUCC Bill' => $v->latestPucc->bill_amount ?? '',
                        'PUCC Start' => $v->latestPucc->valid_from ?? '',
                        'PUCC End' => $v->latestPucc->valid_until ?? '',

                        // --- SPEED GOV ---
                        'Speed Gov No' => $v->latestSpeedGovernor->governor_number ?? '',
                        'Speed Actual' => $v->latestSpeedGovernor->actual_amount ?? '',
                        'Speed Bill' => $v->latestSpeedGovernor->bill_amount ?? '',
                        'Speed Start' => $v->latestSpeedGovernor->valid_from ?? '',
                        'Speed End' => $v->latestSpeedGovernor->valid_until ?? '',

                        // --- VLTD ---
                        'VLTD Vendor' => $v->latestVltd->vendor_name ?? '',
                        'VLTD Actual' => $v->latestVltd->actual_amount ?? '',
                        'VLTD Bill' => $v->latestVltd->bill_amount ?? '',
                        'VLTD Start' => $v->latestVltd->valid_from ?? '',
                        'VLTD End' => $v->latestVltd->valid_until ?? '',
                    ];
                }

                $this->addCsvToZip($zip, 'MASTER_FULL_RECORD.csv', collect($masterData));
            }

            // ==========================================
            // 2. INDIVIDUAL TABLES (Raw Data Dump)
            // ==========================================
            $rtoTables = [
                'citizen' => 'citizens',
                'vehicle' => 'vehicles',
                'tax' => 'taxes',
                'insurance' => 'insurances',
                'fitness' => 'fitnesses',
                'permit' => 'permits',
                'pucc' => 'puccs',
                'speed_gov' => 'speed_governors',
                'vltd' => 'vltds'
            ];

            foreach ($rtoTables as $key => $tableName) {
                if (in_array($key, $selections)) {
                    $q = DB::table($tableName);
                    if ($tableName === 'citizens') {
                        $q->where('user_id', $userId);
                    } elseif ($tableName === 'vehicles') {
                        $q->join('citizens', 'vehicles.citizen_id', '=', 'citizens.id')->where('citizens.user_id', $userId)->select('vehicles.*');
                    } else {
                        $q->join('vehicles', "$tableName.vehicle_id", '=', 'vehicles.id')
                            ->join('citizens', 'vehicles.citizen_id', '=', 'citizens.id')
                            ->where('citizens.user_id', $userId)->select("$tableName.*");
                    }
                    $this->addCsvToZip($zip, "Table_{$key}.csv", $q->get());
                }
            }

            // ==========================================
            // 3. CASH FLOW & WORK BOOK & LICENSES
            // ==========================================
            if (in_array('cash_flow', $selections)) {
                $accs = DB::table('ledger_accounts')->where('user_id', $userId)->get();
                $this->addCsvToZip($zip, 'CashFlow_Accounts.csv', $accs);
                $entries = DB::table('ledger_entries')->where('user_id', $userId)->get();
                $this->addCsvToZip($zip, 'CashFlow_Entries.csv', $entries);
            }

            if (in_array('work_book', $selections)) {
                $clients = DB::table('clients')->where('user_id', $userId)->get();
                $this->addCsvToZip($zip, 'WorkBook_Clients.csv', $clients);
                $jobs = DB::table('work_jobs')->where('user_id', $userId)->get();
                $this->addCsvToZip($zip, 'WorkBook_Jobs.csv', $jobs);
            }

            if (in_array('licenses', $selections)) {
                $licenses = DB::table('licenses')->where('user_id', $userId)->get();
                $this->addCsvToZip($zip, 'Licenses_LL_DL.csv', $licenses);
            }

            $zip->close();
        } else {
            return response()->json(['error' => 'Could not create ZIP'], 500);
        }

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }

    // Helper to generate CSV
    private function addCsvToZip($zip, $filename, $data)
    {
        if ($data->isEmpty()) {
            $zip->addFromString($filename, "Status\nNo records found");
            return;
        }
        $tempStream = fopen('php://memory', 'w+');
        // Add Header
        fputcsv($tempStream, array_keys((array) $data->first()));
        // Add Rows
        foreach ($data as $row) {
            fputcsv($tempStream, (array) $row);
        }
        rewind($tempStream);
        $zip->addFromString($filename, stream_get_contents($tempStream));
        fclose($tempStream);
    }
}
