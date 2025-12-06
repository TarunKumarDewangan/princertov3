<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\WhatsAppService; // Import Service

class WorkJobController extends Controller
{
    // 1. Get List / Search with Stats
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $today = now()->format('Y-m-d');

        // Fetch Clients
        $clients = DB::table('clients')->where('user_id', $userId)->orderBy('name')->get();

        // Build Query for TABLE List
        $query = DB::table('work_jobs')
            ->join('clients', 'work_jobs.client_id', '=', 'clients.id')
            ->where('work_jobs.user_id', $userId)
            ->select('work_jobs.*', 'clients.name as client_name', 'clients.mobile');

        // Filters
        if ($request->client_id) $query->where('work_jobs.client_id', $request->client_id);
        if ($request->from_date) $query->whereDate('work_jobs.job_date', '>=', $request->from_date);
        if ($request->to_date) $query->whereDate('work_jobs.job_date', '<=', $request->to_date);
        if ($request->keyword) {
            $k = $request->keyword;
            $query->where(function($q) use ($k) {
                $q->where('work_jobs.vehicle_no', 'like', "%$k%")
                  ->orWhere('work_jobs.description', 'like', "%$k%");
            });
        }

        $jobs = $query->orderBy('work_jobs.job_date', 'desc')->get();

        // --- STATS CALCULATION ---

        // 1. All Time
        $allBill = DB::table('work_jobs')->where('user_id', $userId)->sum('bill_amount');
        $allPaid = DB::table('work_jobs')->where('user_id', $userId)->sum('paid_amount');

        // 2. Daily (Today)
        $todayBill = DB::table('work_jobs')->where('user_id', $userId)->whereDate('job_date', $today)->sum('bill_amount');
        $todayPaid = DB::table('work_jobs')->where('user_id', $userId)->whereDate('job_date', $today)->sum('paid_amount');

        // 3. Filtered (Current Search)
        $filterBill = $jobs->sum('bill_amount');
        $filterPaid = $jobs->sum('paid_amount');

        return response()->json([
            'clients' => $clients,
            'jobs' => $jobs,
            'stats' => [
                'all' => ['bill' => $allBill, 'paid' => $allPaid, 'due' => $allBill - $allPaid],
                'daily' => ['bill' => $todayBill, 'paid' => $todayPaid, 'due' => $todayBill - $todayPaid],
                'filtered' => ['bill' => $filterBill, 'paid' => $filterPaid, 'due' => $filterBill - $filterPaid]
            ]
        ]);
    }

    // ... (store and destroy methods remain same) ...
    public function store(Request $request)
    {
        $request->validate([ 'client_id' => 'required', 'description' => 'required', 'bill_amount' => 'required|numeric', 'job_date' => 'required|date' ]);
        DB::table('work_jobs')->insert([
            'user_id' => $request->user()->id, 'client_id' => $request->client_id,
            'vehicle_no' => $request->vehicle_no ? strtoupper($request->vehicle_no) : null,
            'description' => strtoupper($request->description),
            'bill_amount' => $request->bill_amount, 'paid_amount' => $request->paid_amount ?? 0,
            'job_date' => $request->job_date, 'created_at' => now(), 'updated_at' => now()
        ]);
        return response()->json(['message' => 'Work Recorded Successfully']);
    }

    public function destroy(Request $request, $id)
    {
        DB::table('work_jobs')->where('id', $id)->where('user_id', $request->user()->id)->delete();
        return response()->json(['message' => 'Job Deleted']);
    }

    // --- NEW: SEND CLIENT REMINDER ---
    public function sendClientReminder(Request $request, WhatsAppService $whatsapp)
    {
        $request->validate(['client_id' => 'required']);
        $user = $request->user();

        $client = DB::table('clients')->where('id', $request->client_id)->where('user_id', $user->id)->first();
        if (!$client) return response()->json(['message' => 'Client not found'], 404);
        if (!$client->mobile) return response()->json(['message' => 'No mobile linked.'], 400);

        // Calculate Pending Dues
        $jobs = DB::table('work_jobs')
            ->where('client_id', $client->id)
            ->where('user_id', $user->id)
            ->get();

        $totalDue = $jobs->sum('bill_amount') - $jobs->sum('paid_amount');

        if ($totalDue <= 0) return response()->json(['message' => 'No pending dues.'], 400);

        $mobile = '91' . $client->mobile;
        $message = "📢 *Prince RTO - Work Dues*\n\n"
            . "Dear {$client->name},\n"
            . "Your total pending amount for RTO Works is: *₹ " . number_format($totalDue) . "*\n\n"
            . "Please clear your dues.\nRegards,\n{$user->name}";

        try {
            if (!$user->whatsapp_key) return response()->json(['message' => 'Setup WhatsApp Keys first.'], 400);
            $whatsapp->sendTextMessage($mobile, $message, $user->whatsapp_key, $user->whatsapp_host);
            return response()->json(['message' => 'Reminder Sent!']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'WhatsApp Failed.'], 500);
        }
    }
}
