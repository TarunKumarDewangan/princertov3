<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminUserManagementController;
use App\Http\Controllers\Api\UserDashboardController;
use App\Http\Controllers\Api\CitizenController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\TaxController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\InsuranceController;
use App\Http\Controllers\Api\PuccController;
use App\Http\Controllers\Api\FitnessController;
use App\Http\Controllers\Api\VltdController;
use App\Http\Controllers\Api\PermitController;
use App\Http\Controllers\Api\SpeedGovernorController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\GlobalSearchController;
use App\Http\Controllers\Api\LedgerController;
use App\Http\Controllers\Api\WorkJobController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\BulkImportController;
use App\Http\Controllers\Api\LicenseController;
use app\Http\Controllers\Api\SubUserController;


// Import Service
use App\Services\WhatsAppService;

// Public Route
Route::post('/login', [AuthController::class, 'login']);
Route::get('/backup/download', [BackupController::class, 'export'])->name('backup.download')->middleware('signed');

// Protected Routes (Require Token)
Route::middleware('auth:sanctum')->group(function () {

    // ... (Your existing routes for users, citizens, etc.) ...
    Route::get('/users', [AdminUserManagementController::class, 'index']);
    Route::post('/users', [AdminUserManagementController::class, 'store']);
    Route::put('/users/{id}', [AdminUserManagementController::class, 'update']);
    Route::patch('/users/{id}/status', [AdminUserManagementController::class, 'toggleStatus']);
    Route::delete('/users/{id}', [AdminUserManagementController::class, 'destroy']);

    Route::get('/user/stats', [UserDashboardController::class, 'stats']);
    Route::get('/citizens', [CitizenController::class, 'index']);
    Route::post('/citizens', [CitizenController::class, 'store']);
    Route::get('/citizens/{id}', [CitizenController::class, 'show']);

    Route::post('/vehicles', [VehicleController::class, 'store']);

    // Document Routes
    Route::get('/vehicles/{id}/taxes', [TaxController::class, 'index']);
    Route::post('/taxes', [TaxController::class, 'store']);
    Route::put('/taxes/{id}', [TaxController::class, 'update']);
    Route::delete('/taxes/{id}', [TaxController::class, 'destroy']);

    Route::get('/vehicles/{id}/insurances', [InsuranceController::class, 'index']);
    Route::post('/insurances', [InsuranceController::class, 'store']);
    Route::put('/insurances/{id}', [InsuranceController::class, 'update']);
    Route::delete('/insurances/{id}', [InsuranceController::class, 'destroy']);

    Route::get('/vehicles/{id}/puccs', [PuccController::class, 'index']);
    Route::post('/puccs', [PuccController::class, 'store']);
    Route::put('/puccs/{id}', [PuccController::class, 'update']);
    Route::delete('/puccs/{id}', [PuccController::class, 'destroy']);

    Route::get('/vehicles/{id}/fitness', [FitnessController::class, 'index']);
    Route::post('/fitness', [FitnessController::class, 'store']);
    Route::put('/fitness/{id}', [FitnessController::class, 'update']);
    Route::delete('/fitness/{id}', [FitnessController::class, 'destroy']);

    Route::get('/vehicles/{id}/vltds', [VltdController::class, 'index']);
    Route::post('/vltds', [VltdController::class, 'store']);
    Route::put('/vltds/{id}', [VltdController::class, 'update']);
    Route::delete('/vltds/{id}', [VltdController::class, 'destroy']);

    Route::get('/vehicles/{id}/permits', [PermitController::class, 'index']);
    Route::post('/permits', [PermitController::class, 'store']);
    Route::put('/permits/{id}', [PermitController::class, 'update']);
    Route::delete('/permits/{id}', [PermitController::class, 'destroy']);

    Route::get('/vehicles/{id}/speed-governors', [SpeedGovernorController::class, 'index']);
    Route::post('/speed-governors', [SpeedGovernorController::class, 'store']);
    Route::put('/speed-governors/{id}', [SpeedGovernorController::class, 'update']);
    Route::delete('/speed-governors/{id}', [SpeedGovernorController::class, 'destroy']);

    Route::post('/payments', [PaymentController::class, 'store']);
    Route::put('/payments/{id}', [PaymentController::class, 'update']);
    Route::delete('/payments/{id}', [PaymentController::class, 'destroy']);

    Route::get('/citizens/{id}/statement', [App\Http\Controllers\Api\AccountController::class, 'statement']);
    Route::get('/reports/expiry', [App\Http\Controllers\Api\ExpiryReportController::class, 'index']);
    Route::get('/export/backup', [BackupController::class, 'export']);
    Route::get('/backup/get-link', [BackupController::class, 'getDownloadLink']);

    Route::put('/citizens/{id}', [CitizenController::class, 'update']);
    Route::delete('/citizens/{id}', [CitizenController::class, 'destroy']);

    Route::get('/global-search', [GlobalSearchController::class, 'search']);
    Route::put('/vehicles/{id}', [VehicleController::class, 'update']);
    Route::delete('/vehicles/{id}', [VehicleController::class, 'destroy']);
    Route::post('/reports/send-notification', [App\Http\Controllers\Api\ExpiryReportController::class, 'sendNotification']);

    Route::get('/ledger/search', [App\Http\Controllers\Api\LedgerController::class, 'search']);

    Route::get('/ledger/search', [App\Http\Controllers\Api\LedgerController::class, 'search']);
    Route::post('/ledger/send-reminder', [App\Http\Controllers\Api\LedgerController::class, 'sendBalanceReminder']);

    Route::get('/ledger', [App\Http\Controllers\Api\LedgerController::class, 'index']);
    Route::post('/ledger/account', [App\Http\Controllers\Api\LedgerController::class, 'storeAccount']);
    Route::post('/ledger/entry', [App\Http\Controllers\Api\LedgerController::class, 'storeEntry']);

    Route::delete('/ledger/entry/{id}', [App\Http\Controllers\Api\LedgerController::class, 'destroyEntry']);
    Route::put('/ledger/account/{id}', [App\Http\Controllers\Api\LedgerController::class, 'updateAccount']);
    Route::delete('/ledger/account/{id}', [App\Http\Controllers\Api\LedgerController::class, 'destroyAccount']);
    // Work Book Routes
    Route::get('/work-jobs', [App\Http\Controllers\Api\WorkJobController::class, 'index']);
    Route::post('/work-jobs', [App\Http\Controllers\Api\WorkJobController::class, 'store']);
    Route::delete('/work-jobs/{id}', [App\Http\Controllers\Api\WorkJobController::class, 'destroy']);
    Route::get('/work-jobs/dues/{clientId}', [App\Http\Controllers\Api\WorkJobController::class, 'getPendingDues']);
    Route::post('/work-jobs/pay', [App\Http\Controllers\Api\WorkJobController::class, 'processPayment']);
    Route::post('/work-jobs/send-reminder', [App\Http\Controllers\Api\WorkJobController::class, 'sendClientReminder']);
    Route::put('/work-jobs/{id}', [App\Http\Controllers\Api\WorkJobController::class, 'update']);

    Route::get('/work-jobs/client/{id}', [App\Http\Controllers\Api\WorkJobController::class, 'getClientHistory']);
    Route::get('/clients', [App\Http\Controllers\Api\ClientController::class, 'index']);
    Route::post('/clients', [App\Http\Controllers\Api\ClientController::class, 'store']);
    Route::put('/clients/{id}', [App\Http\Controllers\Api\ClientController::class, 'update']);
    Route::delete('/clients/{id}', [App\Http\Controllers\Api\ClientController::class, 'destroy']);

    Route::get('/settings/notifications', [App\Http\Controllers\Api\SettingsController::class, 'getSettings']);
    Route::post('/settings/notifications', [App\Http\Controllers\Api\SettingsController::class, 'updateSettings']);

    Route::post('/bulk-import', [App\Http\Controllers\Api\BulkImportController::class, 'import']);


    Route::get('/licenses', [App\Http\Controllers\Api\LicenseController::class, 'index']);
    Route::post('/licenses', [App\Http\Controllers\Api\LicenseController::class, 'store']);
    Route::put('/licenses/{id}', [App\Http\Controllers\Api\LicenseController::class, 'update']);
    Route::delete('/licenses/{id}', [App\Http\Controllers\Api\LicenseController::class, 'destroy']);

    Route::get('/staff', [App\Http\Controllers\Api\SubUserController::class, 'index']);
    Route::post('/staff', [App\Http\Controllers\Api\SubUserController::class, 'store']);
    Route::delete('/staff/{id}', [App\Http\Controllers\Api\SubUserController::class, 'destroy']);

    // --- TEST WHATSAPP ROUTE (UPDATED) ---
    Route::post('/admin/test-whatsapp', function (Request $request) {
        try {
            $request->validate([
                'mobile' => 'required', // 10 digit
                'whatsapp_key' => 'required',
                'whatsapp_host' => 'required'
            ]);

            // --- FORCE PHP TO LOAD THE CLASS MANUALLY ---
            $service = new \App\Services\WhatsAppService();

            $message = "Hello from RTO Hub! Test Successful.";

            // Add 91 prefix
            $mobile = '91' . $request->mobile;

            $service->sendTextMessage(
                $mobile,
                $message,
                $request->whatsapp_key,
                $request->whatsapp_host
            );

            return response()->json(['message' => 'Message sent successfully!']);

        } catch (\Exception $e) {
            // This will show the real error (like "Invalid API Key") in the frontend toast
            return response()->json(['message' => $e->getMessage()], 500);
        }
    });
});
