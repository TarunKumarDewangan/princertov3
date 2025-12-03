<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'citizen_id',
        'registration_no',
        'type',
        'make_model',
        'chassis_no',
        'engine_no',
    ];

    // --- 1. Parent Relationship ---
    public function citizen()
    {
        return $this->belongsTo(Citizen::class);
    }

    // --- 2. Document Relationships (Required for Search) ---

    public function taxes()
    {
        return $this->hasMany(Tax::class);
    }

    public function insurances()
    {
        return $this->hasMany(Insurance::class);
    }

    public function puccs()
    {
        return $this->hasMany(Pucc::class);
    }

    public function fitnesses()
    {
        return $this->hasMany(Fitness::class);
    }

    public function vltds()
    {
        return $this->hasMany(Vltd::class);
    }

    public function permits()
    {
        return $this->hasMany(Permit::class);
    }

    public function speedGovernors()
    {
        return $this->hasMany(SpeedGovernor::class);
    }

    public function latestTax()
    {
        return $this->hasOne(Tax::class)->latestOfMany();
    }
    public function latestInsurance()
    {
        return $this->hasOne(Insurance::class)->latestOfMany();
    }
    public function latestPucc()
    {
        return $this->hasOne(Pucc::class)->latestOfMany();
    }
    public function latestFitness()
    {
        return $this->hasOne(Fitness::class)->latestOfMany();
    }
    public function latestVltd()
    {
        return $this->hasOne(Vltd::class)->latestOfMany();
    }
    public function latestPermit()
    {
        return $this->hasOne(Permit::class)->latestOfMany();
    }
    public function latestSpeedGovernor()
    {
        return $this->hasOne(SpeedGovernor::class)->latestOfMany();
    }
}
