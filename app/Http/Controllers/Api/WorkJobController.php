<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\WhatsAppService;

class WorkJobController extends Controller
{
    // 1. Get List / Search with Stats
    // 1. Get List / Search with Stats
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $today = now()->format('Y-m-d');

        // 1. Fetch Clients with Calculated Totals (Subqueries for performance)
        $clients = DB::table('clients')
            ->where('clients.user_id', $userId)
            ->select(
                'clients.id',
                'clients.name',
                'clients.mobile',
                // Subquery for Total Bill
                DB::raw('(SELECT COALESCE(SUM(bill_amount), 0) FROM work_jobs WHERE work_jobs.client_id = clients.id) as total_bill'),
                // Subquery for Total Paid
                DB::raw('(SELECT COALESCE(SUM(paid_amount), 0) FROM work_jobs WHERE work_jobs.client_id = clients.id) as total_paid'),
                // Subquery for Last Work Date
                DB::raw('(SELECT MAX(job_date) FROM work_jobs WHERE work_jobs.client_id = clients.id) as last_work_date')
            )
            ->orderBy('clients.name')
            ->get();

        // 2. Fetch Jobs (For Stats & Search functionality)
        $query = DB::table('work_jobs')
            ->where('user_id', $userId);

        if ($request->from_date)
            $query->whereDate('job_date', '>=', $request->from_date);
        if ($request->to_date)
            $query->whereDate('job_date', '<=', $request->to_date);

        $jobs = $query->get();

        // --- STATS CALCULATION ---
        $allBill = DB::table('work_jobs')->where('user_id', $userId)->sum('bill_amount');
        $allPaid = DB::table('work_jobs')->where('user_id', $userId)->sum('paid_amount');

        $todayBill = DB::table('work_jobs')->where('user_id', $userId)->whereDate('job_date', $today)->sum('bill_amount');
        $todayPaid = DB::table('work_jobs')->where('user_id', $userId)->whereDate('job_date', $today)->sum('paid_amount');

        return response()->json([
            'clients' => $clients, // Now contains balances
            'jobs' => $jobs,
            'stats' => [
                'all' => ['bill' => $allBill, 'paid' => $allPaid, 'due' => $allBill - $allPaid],
                'daily' => ['bill' => $todayBill, 'paid' => $todayPaid, 'due' => $todayBill - $todayPaid],
                'filtered' => ['bill' => 0, 'paid' => 0, 'due' => 0] // Not used in client view
            ]
        ]);
    }

    // 2. Create Job
    public function store(Request $request)
    {
        $request->validate([
            'client_id' => 'required',
            'description' => 'required',
            'bill_amount' => 'required|numeric',
            'job_date' => 'required|date'
        ]);

        DB::table('work_jobs')->insert([
            'user_id' => $request->user()->id,
            'client_id' => $request->client_id,
            'vehicle_no' => $request->vehicle_no ? strtoupper($request->vehicle_no) : null,
            'description' => strtoupper($request->description),
            'bill_amount' => $request->bill_amount,
            'paid_amount' => $request->paid_amount ?? 0,
            'job_date' => $request->job_date,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json(['message' => 'Work Recorded Successfully']);
    }

    // 3. Delete Job
    public function destroy(Request $request, $id)
    {
        DB::table('work_jobs')->where('id', $id)->where('user_id', $request->user()->id)->delete();
        return response()->json(['message' => 'Job Deleted']);
    }

    // 4. GET PENDING DUES (Fixes 500 Error on Modal Open)
    public function getPendingDues(Request $request, $clientId)
    {
        $jobs = DB::table('work_jobs')
            ->where('client_id', $clientId)
            ->where('user_id', $request->user()->id)
            ->whereRaw('bill_amount > paid_amount') // Only jobs with dues
            ->orderBy('job_date', 'asc')
            ->get();

        $totalDue = $jobs->sum(function ($job) {
            return $job->bill_amount - $job->paid_amount;
        });

        return response()->json([
            'jobs' => $jobs,
            'total_due' => $totalDue
        ]);
    }

    // 5. PROCESS PAYMENT (Fixes 500 Error on Submit)
    public function processPayment(Request $request)
    {
        $request->validate([
            'client_id' => 'required',
            'amount' => 'required|numeric|min:1'
        ]);

        $userId = $request->user()->id;
        $paymentAmount = $request->amount;

        DB::beginTransaction();
        try {
            // 1. Fetch unpaid jobs (Oldest First)
            $jobs = DB::table('work_jobs')
                ->where('client_id', $request->client_id)
                ->where('user_id', $userId)
                ->whereRaw('bill_amount > paid_amount') // Only jobs with dues
                ->orderBy('job_date', 'asc')
                ->get();

            // 2. Distribute money to existing pending jobs
            foreach ($jobs as $job) {
                if ($paymentAmount <= 0)
                    break;

                $pendingOnJob = $job->bill_amount - $job->paid_amount;

                // Determine how much to pay for this specific job
                $amountToPay = ($paymentAmount >= $pendingOnJob) ? $pendingOnJob : $paymentAmount;

                // Update the job
                DB::table('work_jobs')
                    ->where('id', $job->id)
                    ->update([
                        'paid_amount' => $job->paid_amount + $amountToPay,
                        'updated_at' => now()
                    ]);

                // Deduct from wallet
                $paymentAmount -= $amountToPay;
            }

            // 3. HANDLE ADVANCE / EXCESS PAYMENT
            // If there is still money left (or if there were no dues at all),
            // save it as a Credit Entry (Advance).
            if ($paymentAmount > 0) {
                DB::table('work_jobs')->insert([
                    'user_id' => $userId,
                    'client_id' => $request->client_id,
                    'vehicle_no' => '-',
                    'description' => 'ADVANCE PAYMENT / CREDIT',
                    'bill_amount' => 0, // No bill
                    'paid_amount' => $paymentAmount, // Only payment
                    'job_date' => now(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            DB::commit();
            return response()->json(['message' => 'Payment Received Successfully!']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    // 6. Send WhatsApp Reminder
    public function sendClientReminder(Request $request, WhatsAppService $whatsapp)
    {
        $request->validate(['client_id' => 'required']);
        $user = $request->user();

        $client = DB::table('clients')->where('id', $request->client_id)->where('user_id', $user->id)->first();
        if (!$client)
            return response()->json(['message' => 'Client not found'], 404);
        if (!$client->mobile)
            return response()->json(['message' => 'No mobile linked.'], 400);

        // Calculate Pending Dues
        $jobs = DB::table('work_jobs')
            ->where('client_id', $client->id)
            ->where('user_id', $user->id)
            ->get();

        $totalDue = $jobs->sum('bill_amount') - $jobs->sum('paid_amount');

        if ($totalDue <= 0)
            return response()->json(['message' => 'No pending dues.'], 400);

        $mobile = '91' . $client->mobile;
        $message = "📢 *Prince RTO - Work Dues*\n\n"
            . "Dear {$client->name},\n"
            . "Your total pending amount for RTO Works is: *₹ " . number_format($totalDue) . "*\n\n"
            . "Please clear your dues.\nRegards,\n{$user->name}";

        try {
            if (!$user->whatsapp_key)
                return response()->json(['message' => 'Setup WhatsApp Keys first.'], 400);
            $whatsapp->sendTextMessage($mobile, $message, $user->whatsapp_key, $user->whatsapp_host);
            return response()->json(['message' => 'Reminder Sent!']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'WhatsApp Failed.'], 500);
        }
    }
    public function getClientHistory(Request $request, $clientId)
    {
        $userId = $request->user()->id;

        $client = DB::table('clients')->where('id', $clientId)->where('user_id', $userId)->first();
        if (!$client)
            return response()->json(['message' => 'Client not found'], 404);

        // Fetch all jobs/payments for this client
        $jobs = DB::table('work_jobs')
            ->where('client_id', $clientId)
            ->where('user_id', $userId)
            ->orderBy('job_date', 'asc') // Oldest first for timeline
            ->get();

        $totalBill = $jobs->sum('bill_amount');
        $totalPaid = $jobs->sum('paid_amount');

        return response()->json([
            'client' => $client,
            'history' => $jobs,
            'summary' => [
                'total_bill' => $totalBill,
                'total_paid' => $totalPaid,
                'balance' => $totalBill - $totalPaid
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'job_date' => 'required|date',
            // bill_amount or paid_amount can be 0, but not both null usually
        ]);

        $userId = $request->user()->id;

        DB::table('work_jobs')
            ->where('id', $id)
            ->where('user_id', $userId)
            ->update([
                'vehicle_no' => $request->vehicle_no ? strtoupper($request->vehicle_no) : null,
                'description' => $request->description ? strtoupper($request->description) : 'PAYMENT RECEIVED',
                'bill_amount' => $request->bill_amount ?? 0,
                'paid_amount' => $request->paid_amount ?? 0,
                'job_date' => $request->job_date,
                'updated_at' => now()
            ]);

        return response()->json(['message' => 'Entry Updated']);
    }
}
