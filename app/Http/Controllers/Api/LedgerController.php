<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Services\WhatsAppService;

class LedgerController extends Controller
{
    // --- HELPER: GET TEAM IDs ---
    private function getTeamIds($user)
    {
        // If I am Staff (L0), my Boss is parent_id. If I am Boss (L1), I am the parent.
        $bossId = $user->parent_id ?? $user->id;

        // Return Boss ID + All Staff IDs linked to Boss
        return User::where('id', $bossId)->orWhere('parent_id', $bossId)->pluck('id');
    }

    // --- 1. GET DASHBOARD DATA ---
    public function index(Request $request)
    {
        $user = $request->user();
        $teamIds = $this->getTeamIds($user);
        $bossId = $user->parent_id ?? $user->id; // Accounts belong to Boss

        // Get Accounts (Owned by Boss)
        $accounts = DB::table('ledger_accounts')
            ->where('user_id', $bossId)
            ->orderBy('name')
            ->get();

        // Get Recent Entries (From Entire Team)
        $entries = DB::table('ledger_entries')
            ->leftJoin('ledger_accounts', 'ledger_entries.ledger_account_id', '=', 'ledger_accounts.id')
            ->join('users', 'ledger_entries.user_id', '=', 'users.id') // Join Users to get Creator Name
            ->whereIn('ledger_entries.user_id', $teamIds)
            ->select(
                'ledger_entries.*',
                'ledger_accounts.name as account_name',
                'ledger_accounts.mobile as account_mobile',
                'users.name as created_by' // <--- Shows who made the entry
            )
            ->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->limit(50)
            ->get();

        // Calculate Totals (Team Wide)
        $allIn = DB::table('ledger_entries')->whereIn('user_id', $teamIds)->where('txn_type', 'IN')->sum('amount');
        $allOut = DB::table('ledger_entries')->whereIn('user_id', $teamIds)->where('txn_type', 'OUT')->sum('amount');

        $today = now()->format('Y-m-d');
        $todayIn = DB::table('ledger_entries')->whereIn('user_id', $teamIds)->where('txn_type', 'IN')->whereDate('entry_date', $today)->sum('amount');
        $todayOut = DB::table('ledger_entries')->whereIn('user_id', $teamIds)->where('txn_type', 'OUT')->whereDate('entry_date', $today)->sum('amount');

        return response()->json([
            'accounts' => $accounts,
            'entries' => $entries,
            'stats' => [
                'all' => ['in' => $allIn, 'out' => $allOut, 'balance' => $allIn - $allOut],
                'daily' => ['in' => $todayIn, 'out' => $todayOut, 'balance' => $todayIn - $todayOut]
            ]
        ]);
    }

    // --- 2. CREATE ACCOUNT ---
    public function storeAccount(Request $request)
    {
        $request->validate(['name' => 'required']);
        // Always save account under Boss ID so everyone sees it
        $ownerId = $request->user()->parent_id ?? $request->user()->id;

        $id = DB::table('ledger_accounts')->insertGetId([
            'user_id' => $ownerId,
            'name' => strtoupper($request->name),
            'mobile' => $request->mobile ?? null,
            'type' => 'general',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json(['message' => 'Account Created', 'id' => $id]);
    }

    // --- 3. MAKE ENTRY ---
    public function storeEntry(Request $request)
    {
        $request->validate([
            'txn_type' => 'required|in:IN,OUT',
            'amount' => 'required|numeric',
            'entry_date' => 'required|date'
        ]);

        // Entry is saved with Current User ID (to track who made it)
        DB::table('ledger_entries')->insert([
            'user_id' => $request->user()->id,
            'ledger_account_id' => $request->ledger_account_id, // Can be null
            'txn_type' => $request->txn_type,
            'amount' => $request->amount,
            'entry_date' => $request->entry_date,
            'description' => strtoupper($request->description),
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json(['message' => 'Entry Recorded']);
    }

    // --- 4. ADVANCED SEARCH ---
    public function search(Request $request)
    {
        $teamIds = $this->getTeamIds($request->user());

        $query = DB::table('ledger_entries')
            ->leftJoin('ledger_accounts', 'ledger_entries.ledger_account_id', '=', 'ledger_accounts.id')
            ->join('users', 'ledger_entries.user_id', '=', 'users.id')
            ->whereIn('ledger_entries.user_id', $teamIds)
            ->select(
                'ledger_entries.*',
                'ledger_accounts.name as account_name',
                'ledger_accounts.mobile as account_mobile',
                'users.name as created_by'
            );

        if ($request->account_id)
            $query->where('ledger_entries.ledger_account_id', $request->account_id);
        if ($request->from_date)
            $query->whereDate('ledger_entries.entry_date', '>=', $request->from_date);
        if ($request->to_date)
            $query->whereDate('ledger_entries.entry_date', '<=', $request->to_date);
        if ($request->keyword) {
            $k = $request->keyword;
            $query->where(function ($q) use ($k) {
                $q->where('ledger_entries.description', 'like', "%{$k}%")
                    ->orWhere('ledger_entries.amount', 'like', "%{$k}%");
            });
        }

        $entries = $query->orderBy('ledger_entries.entry_date', 'desc')->get();
        $totalIn = $entries->where('txn_type', 'IN')->sum('amount');
        $totalOut = $entries->where('txn_type', 'OUT')->sum('amount');

        return response()->json([
            'entries' => $entries,
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'balance' => $totalIn - $totalOut
        ]);
    }

    // --- 5. DELETE ENTRY (BOSS ONLY) ---
    public function destroyEntry(Request $request, $id)
    {
        if ($request->user()->parent_id) { // If Staff
            return response()->json(['message' => 'Permission Denied: Only Admin can delete.'], 403);
        }

        DB::table('ledger_entries')->where('id', $id)->delete();
        return response()->json(['message' => 'Transaction Deleted']);
    }

    // --- 6. UPDATE ACCOUNT (BOSS ONLY) ---
    public function updateAccount(Request $request, $id)
    {
        if ($request->user()->parent_id)
            return response()->json(['message' => 'Unauthorized'], 403);

        DB::table('ledger_accounts')->where('id', $id)
            ->update(['name' => strtoupper($request->name), 'mobile' => $request->mobile ?? null]);

        return response()->json(['message' => 'Account Updated']);
    }

    // --- 7. DELETE ACCOUNT (BOSS ONLY) ---
    public function destroyAccount(Request $request, $id)
    {
        if ($request->user()->parent_id)
            return response()->json(['message' => 'Unauthorized'], 403);

        DB::table('ledger_accounts')->where('id', $id)->delete();
        return response()->json(['message' => 'Account Deleted']);
    }

    // --- 8. SEND REMINDER ---
    public function sendBalanceReminder(Request $request, WhatsAppService $whatsapp)
    {
        $request->validate(['account_id' => 'required']);
        $user = $request->user();

        // Determine Boss (API Key Owner)
        $boss = $user->parent_id ? User::find($user->parent_id) : $user;

        $account = DB::table('ledger_accounts')->where('id', $request->account_id)->first();
        if (!$account || !$account->mobile)
            return response()->json(['message' => 'Invalid Account/Mobile'], 400);

        // Calc Balance
        $totalIn = DB::table('ledger_entries')->where('ledger_account_id', $account->id)->where('txn_type', 'IN')->sum('amount');
        $totalOut = DB::table('ledger_entries')->where('ledger_account_id', $account->id)->where('txn_type', 'OUT')->sum('amount');
        $bal = $totalIn - $totalOut;

        if (!$boss->whatsapp_key)
            return response()->json(['message' => 'WhatsApp not configured.'], 400);

        $msgType = $bal < 0 ? "DUE" : "ADVANCE";
        $msg = "Dear {$account->name},\nBalance: *₹ " . abs($bal) . " {$msgType}*.\nRegards,\n{$boss->name}";

        try {
            $whatsapp->sendTextMessage('91' . $account->mobile, $msg, $boss->whatsapp_key, $boss->whatsapp_host);
            return response()->json(['message' => 'Sent!']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed'], 500);
        }
    }
}
