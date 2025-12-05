<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // ROLES: 'super_admin', 'level_1', 'level_0'
            $table->string('role')->default('level_0');

            $table->boolean('is_active')->default(true);

            // WhatsApp Config
            $table->string('whatsapp_key')->nullable();
            $table->string('whatsapp_host')->nullable();

            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
