<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Etudiant;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class PresenceReportService
{
    protected $groupService;

    public function __construct(GroupService $groupService)
    {
        $this->groupService = $groupService;
    }

    /**
     * Generate presence report for all groups in an etablissement
     */
    public function generateEtablissementReport(int $etablissementId, string $date = null): array
    {
        $date = $date ? Carbon::parse($date) : Carbon::today();
        
        // Use GroupService to get groups
        $groups = $this->groupService->getGroupsByEtablissement($etablissementId);
        
        $report = [];
        
        foreach ($groups as $group) {
            $groupReport = $this->generateGroupReport($group->id, $date);
            $report[] = [
                'group' => $group->title,
                'total_students' => $groupReport['total_students'],
                'present_students' => $groupReport['present_students'],
                'absent_students' => $groupReport['absent_students'],
                'presence_rate' => $groupReport['presence_rate'],
                'students_details' => $groupReport['students_details']
            ];
        }
        
        return $report;
    }

    /**
     * Generate presence report for a specific group
     */
    public function generateGroupReport(int $groupId, string $date = null): array
    {
        $date = $date ? Carbon::parse($date) : Carbon::today();
        
        // Use GroupService to get students
        $students = $this->groupService->getStudentsByGroup($groupId);
        
        $totalStudents = $students->count();
        $presentStudents = 0;
        $studentsDetails = [];
        
        foreach ($students as $student) {
            // Simulate presence check (replace with actual logic)
            $isPresent = $this->checkStudentPresence($student->matricule, $date);
            $presentStudents += $isPresent ? 1 : 0;
            
            $studentsDetails[] = [
                'matricule' => $student->matricule,
                'name' => $student->first_name . ' ' . $student->last_name,
                'present' => $isPresent,
                'time' => $isPresent ? $this->getStudentArrivalTime($student->matricule, $date) : null
            ];
        }
        
        $presenceRate = $totalStudents > 0 ? round(($presentStudents / $totalStudents) * 100, 2) : 0;
        
        return [
            'total_students' => $totalStudents,
            'present_students' => $presentStudents,
            'absent_students' => $totalStudents - $presentStudents,
            'presence_rate' => $presenceRate,
            'students_details' => $studentsDetails
        ];
    }

    /**
     * Get groups with low presence rate
     */
    public function getGroupsWithLowPresence(int $etablissementId, float $threshold = 70.0): Collection
    {
        $groups = $this->groupService->getGroupsByEtablissement($etablissementId);
        
        return $groups->filter(function ($group) use ($threshold) {
            $report = $this->generateGroupReport($group->id);
            return $report['presence_rate'] < $threshold;
        });
    }

    /**
     * Get students who are frequently absent
     */
    public function getFrequentlyAbsentStudents(int $groupId, int $days = 7): Collection
    {
        $students = $this->groupService->getStudentsByGroup($groupId);
        
        return $students->filter(function ($student) use ($days) {
            $absenceCount = 0;
            $currentDate = Carbon::today();
            
            for ($i = 0; $i < $days; $i++) {
                if (!$this->checkStudentPresence($student->matricule, $currentDate->copy()->subDays($i))) {
                    $absenceCount++;
                }
            }
            
            return $absenceCount >= ($days * 0.5); // Absent 50% of the time
        });
    }

    /**
     * Check if a student is present on a specific date
     * This is a placeholder - replace with actual presence checking logic
     */
    private function checkStudentPresence(string $matricule, Carbon $date): bool
    {
        // Simulate presence check (replace with actual database query)
        return rand(0, 1) === 1;
    }

    /**
     * Get student arrival time
     * This is a placeholder - replace with actual logic
     */
    private function getStudentArrivalTime(string $matricule, Carbon $date): string
    {
        // Simulate arrival time (replace with actual database query)
        $hour = rand(8, 10);
        $minute = rand(0, 59);
        return sprintf('%02d:%02d', $hour, $minute);
    }
} 