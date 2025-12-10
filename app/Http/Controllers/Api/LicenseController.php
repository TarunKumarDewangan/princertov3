<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LicenseController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $query = DB::table('licenses')->where('user_id', $userId);

        if ($request->search) {
            $k = $request->search;
            $query->where(function ($q) use ($k) {
                $q->where('applicant_name', 'like', "%$k%")
                    ->orWhere('mobile_number', 'like', "%$k%")
                    ->orWhere('application_no', 'like', "%$k%")
                    ->orWhere('ll_number', 'like', "%$k%")
                    ->orWhere('dl_number', 'like', "%$k%");
            });
        }

        // Date Range (Created At)
        if ($request->from_date) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->to_date) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'applicant_name' => 'required',
            'dob' => 'required|date',
            'mobile_number' => 'required',
        ]);

        $data = $request->except(['categories']);
        $data['user_id'] = $request->user()->id;
        $data['created_at'] = now();
        $data['updated_at'] = now();

        // Handle array categories to string
        if ($request->categories && is_array($request->categories)) {
            $data['categories'] = implode(',', $request->categories);
        }

        $id = DB::table('licenses')->insertGetId($data);
        return response()->json(['message' => 'License Entry Saved', 'id' => $id]);
    }

    public function update(Request $request, $id)
    {
        $data = $request->except(['id', 'user_id', 'created_at', 'updated_at', 'categories']);

        if ($request->categories && is_array($request->categories)) {
            $data['categories'] = implode(',', $request->categories);
        }

        DB::table('licenses')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update($data);

        return response()->json(['message' => 'Updated Successfully']);
    }

    public function destroy(Request $request, $id)
    {
        DB::table('licenses')->where('id', $id)->where('user_id', $request->user()->id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
