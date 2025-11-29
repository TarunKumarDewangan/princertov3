<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Default Homepage (Shows "Laravel" page)
Route::get('/', function () {
    return view('welcome');
});

// --- UTILITY ROUTE FOR HOSTINGER (Shared Hosting) ---
// Visit https://api.rtodatahub.in/clear-cache to reset the backend
Route::get('/clear-cache', function () {
    try {
        Artisan::call('cache:clear');
        Artisan::call('config:clear');
        Artisan::call('route:clear');
        Artisan::call('view:clear');
        return '<h1>Cache, Config, Route, and Views Cleared Successfully!</h1>';
    } catch (\Exception $e) {
        return 'Error clearing cache: ' . $e->getMessage();
    }
});
