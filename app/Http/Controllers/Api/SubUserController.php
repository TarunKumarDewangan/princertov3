<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class SubUserController extends Controller
{
    // List My Subordinates
    public function index(Request $request)
    {
        // Only Level 1 can see this
        if ($request->user()->isSubordinate())
            abort(403);

        return User::where('parent_id', $request->user()->id)->get();
    }

    // Create Subordinate
    public function store(Request $request)
    {
        $request->validate(['name' => 'required', 'email' => 'required|email|unique:users', 'password' => 'required|min:6']);

        User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'level_0', // Subordinate Role
            'parent_id' => $request->user()->id, // Linked to Creator
            'is_active' => true
        ]);

        return response()->json(['message' => 'Staff Created']);
    }

    // Delete Subordinate
    public function destroy(Request $request, $id)
    {
        User::where('id', $id)->where('parent_id', $request->user()->id)->delete();
        return response()->json(['message' => 'Staff Deleted']);
    }
}
