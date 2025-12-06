<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientController extends Controller
{
    // 1. List Clients
    public function index(Request $request)
    {
        $clients = DB::table('clients')
            ->where('user_id', $request->user()->id)
            ->orderBy('name')
            ->get();
        return response()->json($clients);
    }

    // 2. Create Client
    public function store(Request $request)
    {
        $request->validate(['name' => 'required']);
        DB::table('clients')->insert([
            'user_id' => $request->user()->id,
            'name' => strtoupper($request->name),
            'mobile' => $request->mobile,
            'created_at' => now(),
            'updated_at' => now()
        ]);
        return response()->json(['message' => 'Client Added']);
    }

    // 3. Update Client (Fixes 500 Error on Edit)
    public function update(Request $request, $id)
    {
        $request->validate(['name' => 'required']);

        DB::table('clients')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update([
                'name' => strtoupper($request->name),
                'mobile' => $request->mobile,
                'updated_at' => now()
            ]);

        return response()->json(['message' => 'Client Updated']);
    }

    // 4. Delete Client (Fixes 500 Error on Delete)
    public function destroy(Request $request, $id)
    {
        // This deletes the client AND their work history (Cascade)
        DB::table('clients')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Client Deleted']);
    }
}
