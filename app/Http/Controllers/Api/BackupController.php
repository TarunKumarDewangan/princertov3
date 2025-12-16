<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use App\Models\Vehicle;
use App\Models\User;
use ZipArchive;

class BackupController extends Controller
{
    // Helper: Get Team IDs (Boss + Staff)
    private function getTeamIds($userId)
    {
        return User::where('id', $userId)->orWhere('parent_id', $userId)->pluck('id');
    }

    public function getDownloadLink(Request $request)
    {
        $url = URL::signedRoute('backup.download', [
            'include' => $request->query('include'),
            'user_id' => $request->user()->id
        ], now()->addMinutes(10));

        return response()->json(['url' => $url]);
    }

    public function export(Request $request)
    {
        if (!class_exists('ZipArchive'))
            return response()->json(['error' => 'ZipArchive missing'], 500);
        if (!$request->hasValidSignature())
            abort(403);

        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', 300);

        $userId = $request->query('user_id');
        $teamIds = $this->getTeamIds($userId); // Fetch All Team Data

        $selections = explode(',', $request->query('include'));
        $zipFileName = 'PrinceRTO_Backup_' . date('Y-m-d_H-i') . '.zip';
        $zipPath = public_path($zipFileName);

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {

            // ==========================================
            // 1. MASTER RECORD (ALL FIELDS)
            // ==========================================
            if (in_array('master', $selections)) {
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
                    ->whereHas('citizen', fn($q) => $q->whereIn('user_id', $teamIds))
                    ->get();

                $masterData = [];
                foreach ($vehicles as $v) {
                    $masterData[] = [
                        'Owner' => $v->citizen->name ?? '',
                        'Mobile' => $v->citizen->mobile_number ?? '',
                        'Reg No' => $v->registration_no,
                        'Class' => $v->type,
                        // Documents (All Fields)
                        'Tax Upto' => $v->latestTax->upto_date ?? '',
                        'Tax Bill' => $v->latestTax->bill_amount ?? '',
                        'Ins Upto' => $v->latestInsurance->end_date ?? '',
                        'Ins Bill' => $v->latestInsurance->bill_amount ?? '',
                        'Fit Upto' => $v->latestFitness->valid_until ?? '',
                        'Fit Bill' => $v->latestFitness->bill_amount ?? '',
                        'Permit Upto' => $v->latestPermit->valid_until ?? '',
                        'Permit Bill' => $v->latestPermit->bill_amount ?? '',
                        'PUCC Upto' => $v->latestPucc->valid_until ?? '',
                        'VLTD Upto' => $v->latestVltd->valid_until ?? '',
                        'Speed Gov Upto' => $v->latestSpeedGovernor->valid_until ?? ''
                    ];
                }
                $this->addCsvToZip($zip, 'MASTER_FULL_RECORD.csv', collect($masterData));
            }

            // ==========================================
            // 2. STANDARD TABLES (TEAM DATA)
            // ==========================================
            $rtoTables = ['citizen' => 'citizens', 'vehicle' => 'vehicles', 'tax' => 'taxes', 'insurance' => 'insurances', 'fitness' => 'fitnesses', 'permit' => 'permits', 'pucc' => 'puccs', 'speed_gov' => 'speed_governors', 'vltd' => 'vltds'];

            foreach ($rtoTables as $key => $tableName) {
                if (in_array($key, $selections)) {
                    $q = DB::table($tableName);
                    if ($tableName === 'citizens') {
                        $q->whereIn('user_id', $teamIds);
                    } elseif ($tableName === 'vehicles') {
                        $q->join('citizens', 'vehicles.citizen_id', '=', 'citizens.id')
                            ->whereIn('citizens.user_id', $teamIds)
                            ->select('vehicles.*');
                    } else {
                        $q->join('vehicles', "$tableName.vehicle_id", '=', 'vehicles.id')
                            ->join('citizens', 'vehicles.citizen_id', '=', 'citizens.id')
                            ->whereIn('citizens.user_id', $teamIds)
                            ->select("$tableName.*");
                    }
                    $this->addCsvToZip($zip, "Table_{$key}.csv", $q->get());
                }
            }

            // ==========================================
            // 3. CASH FLOW (IMPORT READY)
            // ==========================================
            if (in_array('cash_flow', $selections)) {
                $entries = DB::table('ledger_entries')
                    ->leftJoin('ledger_accounts', 'ledger_entries.ledger_account_id', '=', 'ledger_accounts.id')
                    ->whereIn('ledger_entries.user_id', $teamIds)
                    ->select(
                        DB::raw("DATE_FORMAT(ledger_entries.entry_date, '%d-%m-%Y') as date"),
                        DB::raw("DATE_FORMAT(ledger_entries.entry_date, '%h:%i %p') as time"),
                        'ledger_accounts.name as account_name',
                        'ledger_entries.txn_type as type',
                        'ledger_entries.amount',
                        'ledger_entries.description'
                    )
                    ->orderBy('ledger_entries.entry_date', 'desc')
                    ->get();

                $csvData = [];
                foreach ($entries as $row) {
                    $csvData[] = [
                        'Date' => $row->date,
                        'Time' => $row->time,
                        'Account Name' => $row->account_name ?? 'General',
                        'Type' => $row->type,
                        'Amount' => $row->amount,
                        'Description' => $row->description
                    ];
                }
                $this->addCsvToZip($zip, 'CashFlow_Import_Ready.csv', collect($csvData));
            }

            // ==========================================
            // 4. WORK BOOK (IMPORT READY - UPDATED)
            // ==========================================
            if (in_array('work_book', $selections)) {
                $jobs = DB::table('work_jobs')
                    ->join('clients', 'work_jobs.client_id', '=', 'clients.id')
                    ->whereIn('work_jobs.user_id', $teamIds)
                    ->select(
                        'clients.name as client_name',
                        'clients.mobile',
                        // Format Date to match import expectation (dd-mm-yyyy HH:mm)
                        DB::raw("DATE_FORMAT(work_jobs.job_date, '%d-%m-%Y %H:%i') as date_time"),
                        'work_jobs.vehicle_no',
                        'work_jobs.description',
                        'work_jobs.bill_amount',
                        'work_jobs.paid_amount'
                    )
                    ->orderBy('work_jobs.job_date', 'desc')
                    ->get();

                // Format specifically for CSV Output with clean headers
                $wbData = [];
                foreach ($jobs as $job) {
                    $wbData[] = [
                        'Client Name' => $job->client_name,
                        'Mobile' => $job->mobile,
                        'Date & Time' => $job->date_time,
                        'Vehicle' => $job->vehicle_no,
                        'Work Description' => $job->description,
                        'Bill Amount' => $job->bill_amount,
                        'Paid Amount' => $job->paid_amount
                    ];
                }

                $this->addCsvToZip($zip, 'WorkBook_Import_Ready.csv', collect($wbData));
            }

            // ==========================================
            // 5. LICENSES
            // ==========================================
            if (in_array('licenses', $selections)) {
                $licenses = DB::table('licenses')->whereIn('user_id', $teamIds)->get();
                $this->addCsvToZip($zip, 'Licenses.csv', $licenses);
            }

            $zip->close();
        } else {
            return response()->json(['error' => 'Zip Failed'], 500);
        }

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }

    private function addCsvToZip($zip, $filename, $data)
    {
        if ($data->isEmpty()) {
            $zip->addFromString($filename, "No records found");
            return;
        }
        $tempStream = fopen('php://memory', 'w+');
        fputcsv($tempStream, array_keys((array) $data->first()));
        foreach ($data as $row)
            fputcsv($tempStream, (array) $row);
        rewind($tempStream);
        $zip->addFromString($filename, stream_get_contents($tempStream));
        fclose($tempStream);
    }
}
