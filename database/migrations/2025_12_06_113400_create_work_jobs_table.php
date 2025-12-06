<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('work_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('ledger_account_id')->constrained('ledger_accounts')->onDelete('cascade');

            $table->date('job_date');
            $table->string('vehicle_no')->nullable();
            $table->string('description');

            $table->decimal('bill_amount', 10, 2)->default(0); // How much you charged
            $table->decimal('paid_amount', 10, 2)->default(0); // How much they paid instantly

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_jobs');
    }
};
