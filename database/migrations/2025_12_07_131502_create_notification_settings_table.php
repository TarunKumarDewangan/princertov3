<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notification_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Columns for each document type (Default 15 days)
            $table->integer('tax_days')->default(15);
            $table->integer('insurance_days')->default(15);
            $table->integer('fitness_days')->default(15);
            $table->integer('permit_days')->default(15);
            $table->integer('pucc_days')->default(7); // PUCC usually needs earlier reminder
            $table->integer('vltd_days')->default(15);
            $table->integer('speed_gov_days')->default(15);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_settings');
    }
};
