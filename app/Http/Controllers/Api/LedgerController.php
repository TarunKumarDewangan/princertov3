<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\WhatsAppService;

class LedgerController extends Controller
{
    // 1. Get Dashboard Data (Default View)
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        // Get Accounts
        $accounts = DB::table('ledger_accounts')
            ->where('user_id', $userId)
            ->orderBy('name')
            ->get();

        // Get Recent Entries (Limit 50)
        $entries = DB::table('ledger_entries')
            ->join('ledger_accounts', 'ledger_entries.ledger_account_id', '=', 'ledger_accounts.id')
            ->where('ledger_entries.user_id', $userId)
            ->select(
                'ledger_entries.*',
                'ledger_accounts.name as account_name',
                'ledger_accounts.mobile as account_mobile'
            )
            ->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->limit(50)
            ->get();

        // Calculate Totals
        $totalIn = DB::table('ledger_entries')->where('user_id', $userId)->where('txn_type', 'IN')->sum('amount');
        $totalOut = DB::table('ledger_entries')->where('user_id', $userId)->where('txn_type', 'OUT')->sum('amount');

        return response()->json([
            'accounts' => $accounts,
            'entries' => $entries,
            'balance' => $totalIn - $totalOut,
            'total_in' => $totalIn,
            'total_out' => $totalOut
        ]);
    }

    // 2. Create Account Head
    public function storeAccount(Request $request)
    {
        $request->validate(['name' => 'required']);

        $id = DB::table('ledger_accounts')->insertGetId([
            'user_id' => $request->user()->id,
            'name' => $request->name,
            'mobile' => $request->mobile ?? null,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json(['message' => 'Account Created', 'id' => $id]);
    }

    // 3. Make Entry (Cash In / Out / Work)
    public function storeEntry(Request $request)
    {
        $request->validate([
            'ledger_account_id' => 'required',
            'txn_type' => 'required|in:IN,OUT',
            'amount' => 'required|numeric',
            'entry_date' => 'required|date'
        ]);

        DB::table('ledger_entries')->insert([
            'user_id' => $request->user()->id,
            'ledger_account_id' => $request->ledger_account_id,
            'txn_type' => $request->txn_type,
            'amount' => $request->amount,
            'entry_date' => $request->entry_date,
            'description' => $request->description,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json(['message' => 'Entry Recorded']);
    }

    // 4. Advanced Search & Filter
    public function search(Request $request)
    {
        $userId = $request->user()->id;

        $query = DB::table('ledger_entries')
            ->join('ledger_accounts', 'ledger_entries.ledger_account_id', '=', 'ledger_accounts.id')
            ->where('ledger_entries.user_id', $userId)
            ->select(
                'ledger_entries.*',
                'ledger_accounts.name as account_name',
                'ledger_accounts.mobile as account_mobile'
            );

        // Filter by Account
        if ($request->account_id) {
            $query->where('ledger_entries.ledger_account_id', $request->account_id);
        }

        // Filter by Date Range
        if ($request->from_date) {
            $query->whereDate('ledger_entries.entry_date', '>=', $request->from_date);
        }
        if ($request->to_date) {
            $query->whereDate('ledger_entries.entry_date', '<=', $request->to_date);
        }

        // Filter by Keyword
        if ($request->keyword) {
            $k = $request->keyword;
            $query->where(function ($q) use ($k) {
                $q->where('ledger_entries.description', 'like', "%{$k}%")
                    ->orWhere('ledger_entries.amount', 'like', "%{$k}%");
            });
        }

        $entries = $query->orderBy('ledger_entries.entry_date', 'desc')->get();

        // Calculate Totals for this specific search result
        $totalIn = $entries->where('txn_type', 'IN')->sum('amount');
        $totalOut = $entries->where('txn_type', 'OUT')->sum('amount');

        return response()->json([
            'entries' => $entries,
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'balance' => $totalIn - $totalOut
        ]);
    }

    // 5. Send Balance Reminder (WhatsApp)
    public function sendBalanceReminder(Request $request, WhatsAppService $whatsapp)
    {
        $request->validate(['account_id' => 'required']);
        $user = $request->user();

        // Fetch Account
        $account = DB::table('ledger_accounts')
            ->where('id', $request->account_id)
            ->where('user_id', $user->id)
            ->first();

        if (!$account)
            return response()->json(['message' => 'Account not found'], 404);
        if (!$account->mobile)
            return response()->json(['message' => 'No mobile number linked to this account.'], 400);

        // Calculate Total Lifetime Balance
        $totalIn = DB::table('ledger_entries')->where('ledger_account_id', $account->id)->where('txn_type', 'IN')->sum('amount');
        $totalOut = DB::table('ledger_entries')->where('ledger_account_id', $account->id)->where('txn_type', 'OUT')->sum('amount');

        $balance = $totalIn - $totalOut;
        $absBalance = number_format(abs($balance), 2);

        // Determine Context
        if ($balance < 0) {
            $msgType = "DUE (उधारी)";
            $action = "Please pay this amount at the earliest.\nकृपया बकाया राशि का भुगतान करें।";
        } else {
            $msgType = "ADVANCE (जमा)";
            $action = "This amount is available in your account.\nयह राशि आपके खाते में जमा है।";
        }

        $mobile = '91' . $account->mobile;
        $message = "📢 *Prince RTO - Account Statement*\n\n"
            . "Dear {$account->name},\n"
            . "Current Balance: *₹ {$absBalance} {$msgType}*\n\n"
            . "{$action}\n\n"
            . "Regards,\n{$user->name}";

        try {
            if (!$user->whatsapp_key) {
                return response()->json(['message' => 'WhatsApp API not configured.'], 400);
            }
            $whatsapp->sendTextMessage($mobile, $message, $user->whatsapp_key, $user->whatsapp_host);
            return response()->json(['message' => 'Reminder Sent Successfully!']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send WhatsApp.'], 500);
        }
    }
}
