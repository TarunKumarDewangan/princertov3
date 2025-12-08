<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Change column from DATE to DATETIME to store Time
        DB::statement('ALTER TABLE work_jobs MODIFY job_date DATETIME');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE work_jobs MODIFY job_date DATE');
    }
};
