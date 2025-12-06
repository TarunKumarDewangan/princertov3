<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Citizen;
use App\Models\Vehicle;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class UserDashboardController extends Controller
{
    public function stats(Request $request)
    {
        $userId = $request->user()->id;
        $today = Carbon::today();
        $next15Days = Carbon::today()->addDays(15);

        // 1. Existing Stats
        $totalCitizens = Citizen::where('user_id', $userId)->count();
        $totalVehicles = Vehicle::whereHas('citizen', fn($q) => $q->where('user_id', $userId))->count();

        // 2. Document Collection (Today)
        $collectedToday = Payment::whereDate('payment_date', $today)
            ->where(function ($query) use ($userId) {
                $query->whereHas('tax.vehicle.citizen', fn($q) => $q->where('user_id', $userId))
                    ->orWhereHas('insurance.vehicle.citizen', fn($q) => $q->where('user_id', $userId))
                    // ... other docs ...
                    ->orWhereHas('pucc.vehicle.citizen', fn($q) => $q->where('user_id', $userId));
            })
            ->sum('amount');

        // 3. NEW: Cash Flow Ledger Balance (Net)
        $ledgerIn = DB::table('ledger_entries')->where('user_id', $userId)->where('txn_type', 'IN')->sum('amount');
        $ledgerOut = DB::table('ledger_entries')->where('user_id', $userId)->where('txn_type', 'OUT')->sum('amount');
        $ledgerBalance = $ledgerIn - $ledgerOut;

        // 4. NEW: Work Book Pending Dues
        $workBill = DB::table('work_jobs')->where('user_id', $userId)->sum('bill_amount');
        $workPaid = DB::table('work_jobs')->where('user_id', $userId)->sum('paid_amount');
        $workDues = $workBill - $workPaid;

        // 5. Expiring Soon (Optimized)
        $expiringSoon = 0;
        $docTables = ['taxes' => 'upto_date', 'insurances' => 'end_date', 'puccs' => 'valid_until', 'fitnesses' => 'valid_until', 'permits' => 'valid_until', 'vltds' => 'valid_until', 'speed_governors' => 'valid_until'];

        foreach ($docTables as $table => $col) {
            $expiringSoon += DB::table($table)
                ->join('vehicles', "$table.vehicle_id", '=', 'vehicles.id')
                ->join('citizens', 'vehicles.citizen_id', '=', 'citizens.id')
                ->where('citizens.user_id', $userId)
                ->whereBetween("$table.$col", [$today, $next15Days])
                ->count();
        }

        return response()->json([
            'total_citizens' => $totalCitizens,
            'total_vehicles' => $totalVehicles,
            'collected_today' => (int) $collectedToday,
            'expiring_soon' => $expiringSoon,
            'ledger_balance' => (int) $ledgerBalance, // New
            'work_dues' => (int) $workDues // New
        ]);
    }
}
