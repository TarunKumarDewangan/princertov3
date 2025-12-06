<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Create separate Clients table
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('mobile')->nullable();
            $table->timestamps();
        });

        // 2. Drop old work_jobs table and recreate with client_id
        Schema::dropIfExists('work_jobs');

        Schema::create('work_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            // Linked to CLIENTS now, not ledger_accounts
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');

            $table->date('job_date');
            $table->string('vehicle_no')->nullable();
            $table->string('description');

            // Just for record keeping (Does not affect cash ledger)
            $table->decimal('bill_amount', 10, 2)->default(0);
            $table->decimal('paid_amount', 10, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_jobs');
        Schema::dropIfExists('clients');
    }
};
