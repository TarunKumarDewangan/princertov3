<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('licenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // LL Details
            $table->string('applicant_name');
            $table->date('dob');
            $table->string('mobile_number');
            $table->string('application_no')->nullable();
            $table->text('address')->nullable();
            $table->string('ll_number')->nullable();
            $table->string('categories')->nullable(); // Stored as comma separated (e.g. "MCWG,LMV")
            $table->date('ll_valid_from')->nullable();
            $table->date('ll_valid_upto')->nullable();
            $table->string('ll_status')->default('Form Complete');

            // DL Details (Optional initially)
            $table->string('dl_status')->nullable();
            $table->string('dl_app_no')->nullable();
            $table->string('dl_number')->nullable();
            $table->date('dl_valid_from')->nullable();
            $table->date('dl_valid_upto')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licenses');
    }
};
