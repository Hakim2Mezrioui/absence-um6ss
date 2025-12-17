<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cours', function (Blueprint $table) {
            if (!Schema::hasColumn('cours', 'tracking_method')) {
                $table->enum('tracking_method', ['biostar', 'qr_code'])
                    ->default('biostar')
                    ->after('attendance_mode');
            }
        });

        if (Schema::hasTable('examens')) {
            Schema::table('examens', function (Blueprint $table) {
                if (!Schema::hasColumn('examens', 'tracking_method')) {
                    $table->enum('tracking_method', ['biostar', 'qr_code'])
                        ->default('biostar')
                        ->after('tolerance');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cours', function (Blueprint $table) {
            if (Schema::hasColumn('cours', 'tracking_method')) {
                $table->dropColumn('tracking_method');
            }
        });

        if (Schema::hasTable('examens')) {
            Schema::table('examens', function (Blueprint $table) {
                if (Schema::hasColumn('examens', 'tracking_method')) {
                    $table->dropColumn('tracking_method');
                }
            });
        }
    }
};


