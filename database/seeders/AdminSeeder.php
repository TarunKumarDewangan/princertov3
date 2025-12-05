<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Check if super admin exists to avoid duplicates
        if (!User::where('email', 'admin@princerto.in')->exists()) {
            User::create([
                'name' => 'Prince Super Admin',
                'email' => 'tarun1993@gmail.com',
                'role' => 'super_admin', // <--- IMPORTANT
                'password' => Hash::make('password'), // Change this later
                'is_active' => true
            ]);
        }
    }
}
