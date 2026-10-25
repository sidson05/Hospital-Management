package com.hospital.hms.modules.patient.controller;

import com.hospital.hms.common.api.ApiResponse;
import com.hospital.hms.modules.patient.dto.PatientDto;
import com.hospital.hms.modules.patient.dto.UpdatePatientProfileRequest;
import com.hospital.hms.modules.patient.service.PatientService;
import com.hospital.hms.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Tag(name = "Patient Management", description = "Endpoints for viewing and updating patient profiles")
public class PatientController {

    private final PatientService patientService;

    @Operation(summary = "Get current authenticated patient profile")
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<PatientDto>> getMyProfile() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        PatientDto profile = patientService.getPatientByUserId(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @Operation(summary = "Update current patient medical profile")
    @PutMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<PatientDto>> updateMyProfile(@RequestBody UpdatePatientProfileRequest request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        PatientDto current = patientService.getPatientByUserId(currentUserId);
        PatientDto updated = patientService.updateProfile(current.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Profile updated successfully"));
    }

    @Operation(summary = "Admin endpoint to retrieve patient profile by patient ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PatientDto>> getPatientById(@PathVariable UUID id) {
        PatientDto profile = patientService.getPatientById(id);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}
