<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GlobalSearchController extends Controller
{
    public function search(Request $request)
    {
        try {
            $query = $request->input('query');
            $userId = $request->user()->id;

            if (!$query || strlen($query) < 2) {
                return response()->json([]);
            }

            $results = [];

            // 1. SEARCH CITIZENS (Name, Mobile)
            $citizens = DB::table('citizens')
                ->where('user_id', $userId)
                ->where(function ($q) use ($query) {
                    $q->where('name', 'like', "%{$query}%")
                        ->orWhere('mobile_number', 'like', "%{$query}%");
                })
                ->limit(5)
                ->get();

            foreach ($citizens as $c) {
                $results[] = [
                    'id' => $c->id,
                    'title' => $c->name,
                    'subtitle' => "Mobile: " . $c->mobile_number,
                    'type' => 'Citizen',
                    'link' => "/citizens/{$c->id}"
                ];
            }

            // 2. SEARCH VEHICLES (Reg No, Chassis)
            $vehicles = DB::table('vehicles')
                ->join('citizens', 'vehicles.citizen_id', '=', 'citizens.id')
                ->where('citizens.user_id', $userId)
                ->where(function ($q) use ($query) {
                    $q->where('registration_no', 'like', "%{$query}%")
                        ->orWhere('chassis_no', 'like', "%{$query}%");
                })
                ->select('vehicles.*', 'citizens.name as owner_name', 'citizens.id as owner_id')
                ->limit(5)
                ->get();

            foreach ($vehicles as $v) {
                $results[] = [
                    'id' => $v->owner_id, // Link to Owner
                    'title' => $v->registration_no,
                    'subtitle' => "Vehicle - Owner: " . $v->owner_name,
                    'type' => 'Vehicle',
                    'link' => "/citizens/{$v->owner_id}" // Go to Citizen Page
                ];
            }

            // 3. SEARCH LICENSES (LL, DL, Name, App No)
            $licenses = DB::table('licenses')
                ->where('user_id', $userId)
                ->where(function ($q) use ($query) {
                    $q->where('applicant_name', 'like', "%{$query}%")
                        ->orWhere('ll_number', 'like', "%{$query}%")
                        ->orWhere('dl_number', 'like', "%{$query}%")
                        ->orWhere('application_no', 'like', "%{$query}%")
                        ->orWhere('mobile_number', 'like', "%{$query}%");
                })
                ->limit(5)
                ->get();

            foreach ($licenses as $l) {
                $identifier = $l->dl_number ? "DL: " . $l->dl_number : "LL: " . $l->ll_number;
                $results[] = [
                    'id' => $l->id,
                    'title' => $l->applicant_name,
                    'subtitle' => $identifier,
                    'type' => 'License',
                    'link' => "/license-flow" // Go to License Page
                ];
            }

            return response()->json($results);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Search failed'], 500);
        }
    }
}
