<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    public function getSettings(Request $request)
    {
        $userId = $request->user()->id;
        $settings = DB::table('notification_settings')->where('user_id', $userId)->first();

        // If no settings exist, return defaults
        if (!$settings) {
            return response()->json([
                'tax_days' => 15,
                'insurance_days' => 15,
                'fitness_days' => 15,
                'permit_days' => 15,
                'pucc_days' => 7,
                'vltd_days' => 15,
                'speed_gov_days' => 15
            ]);
        }

        return response()->json($settings);
    }

    public function updateSettings(Request $request)
    {
        $userId = $request->user()->id;

        // Use updateOrInsert to handle both cases
        DB::table('notification_settings')->updateOrInsert(
            ['user_id' => $userId],
            [
                'tax_days' => $request->tax_days,
                'insurance_days' => $request->insurance_days,
                'fitness_days' => $request->fitness_days,
                'permit_days' => $request->permit_days,
                'pucc_days' => $request->pucc_days,
                'vltd_days' => $request->vltd_days,
                'speed_gov_days' => $request->speed_gov_days,
                'updated_at' => now()
            ]
        );

        return response()->json(['message' => 'Settings Saved Successfully']);
    }
}
