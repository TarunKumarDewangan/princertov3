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
