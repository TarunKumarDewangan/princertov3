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
        Schema::table('licenses', function (Blueprint $table) {
            // LL Financials
            $table->decimal('ll_bill_amount', 10, 2)->default(0)->after('ll_status');
            $table->decimal('ll_paid_amount', 10, 2)->default(0)->after('ll_bill_amount');

            // DL Financials
            $table->decimal('dl_bill_amount', 10, 2)->default(0)->after('dl_status');
            $table->decimal('dl_paid_amount', 10, 2)->default(0)->after('dl_bill_amount');
        });
    }

    public function down(): void
    {
        Schema::table('licenses', function (Blueprint $table) {
            $table->dropColumn(['ll_bill_amount', 'll_paid_amount', 'dl_bill_amount', 'dl_paid_amount']);
        });
    }
};
