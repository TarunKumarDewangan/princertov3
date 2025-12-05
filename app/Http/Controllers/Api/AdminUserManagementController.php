<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminUserManagementController extends Controller
{
    // Helper to ensure only Super Admin accesses this
    private function checkSuperAdmin($request)
    {
        if ($request->user()->role !== 'super_admin') {
            abort(403, 'Unauthorized: Super Admin Access Required');
        }
    }

    public function index(Request $request)
    {
        $this->checkSuperAdmin($request);

        // Get all users EXCEPT the Super Admin himself
        $users = User::where('role', '!=', 'super_admin')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $this->checkSuperAdmin($request);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
            'role' => 'required|in:level_1,level_0', // Validates role input
            'whatsapp_key' => 'nullable|string',
            'whatsapp_host' => 'nullable|string',
        ]);

        User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role, // Saves 'level_1' or 'level_0'
            'is_active' => true,
            'whatsapp_key' => $request->whatsapp_key,
            'whatsapp_host' => $request->whatsapp_host,
        ]);

        return response()->json(['message' => 'Staff User Created Successfully']);
    }

    public function update(Request $request, $id)
    {
        $this->checkSuperAdmin($request);
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users')->ignore($user->id)],
            'role' => 'required|in:level_1,level_0',
            'whatsapp_key' => 'nullable|string',
            'whatsapp_host' => 'nullable|string',
        ]);

        $user->name = $request->name;
        $user->email = $request->email;
        $user->role = $request->role; // Updates role
        $user->whatsapp_key = $request->whatsapp_key;
        $user->whatsapp_host = $request->whatsapp_host;

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return response()->json(['message' => 'Staff User Updated Successfully']);
    }

    public function toggleStatus(Request $request, $id)
    {
        $this->checkSuperAdmin($request);
        $user = User::findOrFail($id);
        $user->is_active = !$user->is_active;
        $user->save();
        return response()->json(['message' => 'User Status Updated']);
    }

    public function destroy(Request $request, $id)
    {
        $this->checkSuperAdmin($request);
        $user = User::findOrFail($id);

        // Prevent accidental deletion of self (just in case)
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete yourself'], 400);
        }

        $user->delete();
        return response()->json(['message' => 'User Deleted']);
    }
}
