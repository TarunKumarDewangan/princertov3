<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Services\WhatsAppService;

// Import Models
use App\Models\User;
use App\Models\Tax;
use App\Models\Insurance;
use App\Models\Fitness;
use App\Models\Permit;
use App\Models\Pucc;
use App\Models\SpeedGovernor;
use App\Models\Vltd;

class SendExpiryNotifications extends Command
{
    protected $signature = 'notifications:send-expiries';
    protected $description = 'Check expiring documents based on user settings and send WhatsApp alerts.';

    public function handle(WhatsAppService $whatsAppService): void
    {
        $this->info('Starting Dynamic Expiry Check...');
        Log::info('Scheduler Started: Checking expiries...');

        // 1. Get all Active Users (Agents)
        $users = User::where('is_active', true)->get();

        foreach ($users as $user) {
            // Get user's custom settings (or defaults if not set)
            $settings = DB::table('notification_settings')->where('user_id', $user->id)->first();

            // Default fallback if user hasn't saved settings yet
            $defaults = [
                'tax_days' => 15,
                'insurance_days' => 15,
                'fitness_days' => 15,
                'permit_days' => 15,
                'pucc_days' => 7,
                'vltd_days' => 15,
                'speed_gov_days' => 15
            ];

            // 2. Check each document type with dynamic days
            $this->checkUserDocs($user, Tax::class, 'upto_date', 'Road Tax', $settings->tax_days ?? $defaults['tax_days'], $whatsAppService);
            $this->checkUserDocs($user, Insurance::class, 'end_date', 'Insurance', $settings->insurance_days ?? $defaults['insurance_days'], $whatsAppService);
            $this->checkUserDocs($user, Fitness::class, 'valid_until', 'Fitness', $settings->fitness_days ?? $defaults['fitness_days'], $whatsAppService);
            $this->checkUserDocs($user, Permit::class, 'valid_until', 'Permit', $settings->permit_days ?? $defaults['permit_days'], $whatsAppService);
            $this->checkUserDocs($user, Pucc::class, 'valid_until', 'PUCC', $settings->pucc_days ?? $defaults['pucc_days'], $whatsAppService);
            $this->checkUserDocs($user, Vltd::class, 'valid_until', 'VLTD', $settings->vltd_days ?? $defaults['vltd_days'], $whatsAppService);
            $this->checkUserDocs($user, SpeedGovernor::class, 'valid_until', 'Speed Governor', $settings->speed_gov_days ?? $defaults['speed_gov_days'], $whatsAppService);
        }

        $this->info('All checks completed.');
        Log::info('Scheduler Finished.');
    }

    private function checkUserDocs($user, $modelClass, $dateCol, $docName, $daysBefore, $service)
    {
        $targetDate = Carbon::today()->addDays($daysBefore)->toDateString();

        // Find documents expiring on EXACTLY that target date for THIS user only
        $records = $modelClass::whereDate($dateCol, $targetDate)
            ->whereHas('vehicle.citizen', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->with('vehicle.citizen')
            ->get();

        foreach ($records as $rec) {
            $this->processNotification($service, $user, $rec, $docName, $rec->$dateCol);
        }
    }

    private function processNotification($service, $user, $record, $docName, $expiryDate)
    {
        // Safety Check
        if (!$record->vehicle || !$record->vehicle->citizen) {
            return;
        }

        $vehicle = $record->vehicle;
        $citizen = $vehicle->citizen;

        // 1. Check Credentials
        if (empty($user->whatsapp_key) || empty($user->whatsapp_host)) {
            Log::warning("Skipped {$vehicle->registration_no}: Agent {$user->name} has no API Key.");
            return;
        }

        // 2. Prepare Data
        $regNo = $vehicle->registration_no;
        $mobile = '91' . $citizen->mobile_number;
        $dateStr = Carbon::parse($expiryDate)->format('d-m-Y');

        // 3. Message
        $message = "प्रिय ग्राहक,\n\nआपके वाहन {$regNo} के {$docName} की वैधता {$dateStr} को समाप्त हो रही है।\n\nकृपया समय पर नवीनीकरण कराएं और जुर्माने से बचें।\n\nसंपर्क करें:\n{$user->name}";

        // 4. Send
        $this->info("Sending to {$mobile} for {$user->name}...");

        try {
            $success = $service->sendTextMessage($mobile, $message, $user->whatsapp_key, $user->whatsapp_host);
            if ($success) {
                $this->info("✅ Sent Successfully.");
            }
        } catch (\Exception $e) {
            $this->error("❌ Failed: " . $e->getMessage());
        }
    }
}
