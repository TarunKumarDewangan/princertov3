<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Citizen;
use Carbon\Carbon;

// 👇 THIS LINE WAS MISSING OR INCORRECT
use App\Services\WhatsAppService;

class ExpiryReportController extends Controller
{
    public function index(Request $request)
    {
        // --- 1. Get Team IDs (Boss + Staff) ---
        $user = $request->user();
        $bossId = $user->parent_id ?? $user->id;
        $teamIds = \App\Models\User::where('id', $bossId)->orWhere('parent_id', $bossId)->pluck('id');

        // --- 2. Filter Inputs ---
        $citizenId = $request->citizen_id;
        $name = $request->owner_name;
        $vehicleNo = $request->vehicle_no;
        $docType = $request->doc_type;
        $dateFrom = $request->expiry_from;
        $dateUpto = $request->expiry_upto;

        $buildQuery = function ($table, $typeLabel, $dateCol) use ($teamIds) {
            return DB::table($table)
                ->join('vehicles', "$table.vehicle_id", '=', 'vehicles.id')
                ->join('citizens', 'vehicles.citizen_id', '=', 'citizens.id')
                ->whereIn('citizens.user_id', $teamIds) // <--- CHANGED TO whereIn
                ->select(
                    'citizens.id as citizen_id',
                    'citizens.name as owner_name',
                    'citizens.mobile_number',
                    'vehicles.registration_no',
                    'vehicles.id as vehicle_id',
                    "$table.id as doc_id",
                    DB::raw("'$typeLabel' as doc_type"),
                    "$table.$dateCol as expiry_date"
                );
        };

        // ... (rest of the query logic remains same) ...

        $queries = [];
        if (!$docType || $docType == 'Tax')
            $queries[] = $buildQuery('taxes', 'Tax', 'upto_date');
        if (!$docType || $docType == 'Insurance')
            $queries[] = $buildQuery('insurances', 'Insurance', 'end_date');
        if (!$docType || $docType == 'PUCC')
            $queries[] = $buildQuery('puccs', 'PUCC', 'valid_until');
        if (!$docType || $docType == 'Fitness')
            $queries[] = $buildQuery('fitnesses', 'Fitness', 'valid_until');
        if (!$docType || $docType == 'Permit')
            $queries[] = $buildQuery('permits', 'Permit', 'valid_until');
        if (!$docType || $docType == 'Speed Gov')
            $queries[] = $buildQuery('speed_governors', 'Speed Gov', 'valid_until');
        if (!$docType || $docType == 'VLTD')
            $queries[] = $buildQuery('vltds', 'VLTD', 'valid_until');

        $mainQuery = null;
        foreach ($queries as $q) {
            if (!$mainQuery)
                $mainQuery = $q;
            else
                $mainQuery->union($q);
        }

        $result = DB::query()->fromSub($mainQuery, 'combined_table');

        if ($citizenId)
            $result->where('citizen_id', $citizenId);
        if ($name)
            $result->where('owner_name', 'like', "%$name%");
        if ($vehicleNo)
            $result->where('registration_no', 'like', "%$vehicleNo%");
        if ($dateFrom)
            $result->whereDate('expiry_date', '>=', $dateFrom);
        if ($dateUpto)
            $result->whereDate('expiry_date', '<=', $dateUpto);

        $result->orderBy('expiry_date', 'asc');

        return response()->json($result->paginate(15));
    }

    // --- MANUAL SEND FUNCTION ---
    public function sendNotification(Request $request, WhatsAppService $whatsapp)
    {
        $request->validate([
            'citizen_id' => 'required',
            'registration_no' => 'required',
            'doc_type' => 'required',
            'expiry_date' => 'required'
        ]);

        // 1. Get Citizen and their Agent (User)
        $citizen = Citizen::with('user')->findOrFail($request->citizen_id);
        $user = $citizen->user; // The Agent

        // 2. Check Credentials
        if (empty($user->whatsapp_key) || empty($user->whatsapp_host)) {
            return response()->json(['message' => 'WhatsApp API not configured for this account.'], 400);
        }

        // 3. Prepare Message (Same format as Cron Job)
        $mobile = '91' . $citizen->mobile_number;
        $dateStr = Carbon::parse($request->expiry_date)->format('d-m-Y');

        $message = "प्रिय ग्राहक,\n\nआपके वाहन {$request->registration_no} के {$request->doc_type} की वैधता {$dateStr} को समाप्त हो रही है।\n\nकृपया समय पर नवीनीकरण कराएं और जुर्माने से बचें।\n\nसंपर्क करें:\n{$user->name}";

        // 4. Send
        try {
            $whatsapp->sendTextMessage(
                $mobile,
                $message,
                $user->whatsapp_key,
                $user->whatsapp_host
            );
            return response()->json(['message' => 'Message Sent Successfully!']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send: ' . $e->getMessage()], 500);
        }
    }
}
