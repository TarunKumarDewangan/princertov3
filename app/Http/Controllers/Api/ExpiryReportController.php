<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Citizen;
use App\Models\User;
use Carbon\Carbon;
use App\Services\WhatsAppService;

class ExpiryReportController extends Controller
{
    public function index(Request $request)
    {
        // --- 1. Get Team IDs (Boss + Staff) ---
        // This ensures Staff (Level 0) see the same data as Boss (Level 1)
        $user = $request->user();
        $bossId = $user->parent_id ?? $user->id;
        $teamIds = User::where('id', $bossId)->orWhere('parent_id', $bossId)->pluck('id');

        // --- 2. Filter Inputs ---
        $citizenId = $request->citizen_id;
        $name = $request->owner_name;
        $vehicleNo = $request->vehicle_no;
        $docType = $request->doc_type;
        $dateFrom = $request->expiry_from;
        $dateUpto = $request->expiry_upto;

        // Helper to build query for each document table
        $buildQuery = function ($table, $typeLabel, $dateCol) use ($teamIds) {
            return DB::table($table)
                ->join('vehicles', "$table.vehicle_id", '=', 'vehicles.id')
                ->join('citizens', 'vehicles.citizen_id', '=', 'citizens.id')
                ->whereIn('citizens.user_id', $teamIds) // <--- Fetch data for entire team
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

        // --- 3. Build Union Query for All Doc Types ---
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

        // Combine all queries
        $mainQuery = null;
        foreach ($queries as $q) {
            if (!$mainQuery)
                $mainQuery = $q;
            else
                $mainQuery->union($q);
        }

        // --- 4. Apply Filters to Combined Results ---
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

    // --- MANUAL SEND FUNCTION (WhatsApp) ---
    public function sendNotification(Request $request, WhatsAppService $whatsapp)
    {
        $request->validate([
            'citizen_id' => 'required',
            'registration_no' => 'required',
            'doc_type' => 'required',
            'expiry_date' => 'required'
        ]);

        // 1. Get Citizen and their Agent (Boss)
        $citizen = Citizen::with('user')->findOrFail($request->citizen_id);

        // Since we force citizens to be saved under Boss ID, $citizen->user IS the Boss.
        $boss = $citizen->user;

        // 2. Check Credentials
        if (empty($boss->whatsapp_key) || empty($boss->whatsapp_host)) {
            return response()->json(['message' => 'WhatsApp API not configured for the Admin.'], 400);
        }

        // 3. Prepare Message
        $mobile = '91' . $citizen->mobile_number;
        $dateStr = Carbon::parse($request->expiry_date)->format('d-m-Y');

        $message = "प्रिय ग्राहक,\n\nआपके वाहन {$request->registration_no} के {$request->doc_type} की वैधता {$dateStr} को समाप्त हो रही है।\n\nकृपया समय पर नवीनीकरण कराएं और जुर्माने से बचें।\n\nसंपर्क करें:\n{$boss->name}";

        // 4. Send
        try {
            $whatsapp->sendTextMessage(
                $mobile,
                $message,
                $boss->whatsapp_key,
                $boss->whatsapp_host
            );
            return response()->json(['message' => 'Message Sent Successfully!']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send: ' . $e->getMessage()], 500);
        }
    }
}
