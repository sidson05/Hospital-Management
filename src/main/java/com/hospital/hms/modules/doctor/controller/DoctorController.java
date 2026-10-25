package com.hospital.hms.modules.doctor.controller;

import com.hospital.hms.common.api.ApiResponse;
import com.hospital.hms.modules.appointment.dto.TimeSlotResponse;
import com.hospital.hms.modules.appointment.service.SlotCalculationService;
import com.hospital.hms.modules.doctor.dto.AvailabilityDto;
import com.hospital.hms.modules.doctor.dto.CreateAvailabilityRequest;
import com.hospital.hms.modules.doctor.dto.CreateDoctorRequest;
import com.hospital.hms.modules.doctor.dto.DoctorDto;
import com.hospital.hms.modules.doctor.service.DoctorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/doctors")
@RequiredArgsConstructor
@Tag(name = "Doctor Management", description = "Endpoints for doctor discovery, profile management, and weekly availability")
public class DoctorController {

    private final DoctorService doctorService;
    private final SlotCalculationService slotCalculationService;

    @Operation(summary = "Get list of active doctors, optionally filtered by specialization")
    @GetMapping
    public ResponseEntity<ApiResponse<List<DoctorDto>>> getAllDoctors(
            @RequestParam(required = false) String specialization) {
        List<DoctorDto> doctors = doctorService.getAllDoctors(specialization);
        return ResponseEntity.ok(ApiResponse.success(doctors));
    }

    @Operation(summary = "Get doctor details by doctor ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DoctorDto>> getDoctorById(@PathVariable UUID id) {
        DoctorDto doctor = doctorService.getDoctorById(id);
        return ResponseEntity.ok(ApiResponse.success(doctor));
    }

    @Operation(summary = "Get free and booked time slots for a doctor on a specific date")
    @GetMapping("/{id}/slots")
    public ResponseEntity<ApiResponse<List<TimeSlotResponse>>> getDoctorSlots(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<TimeSlotResponse> slots = slotCalculationService.calculateSlotsForDate(id, date);
        return ResponseEntity.ok(ApiResponse.success(slots));
    }

    @Operation(summary = "Admin-only endpoint to onboard a new doctor")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DoctorDto>> createDoctor(@Valid @RequestBody CreateDoctorRequest request) {
        DoctorDto doctor = doctorService.createDoctor(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(doctor, "Doctor onboarded successfully"));
    }

    @Operation(summary = "Get weekly availability template of a doctor")
    @GetMapping("/{id}/availabilities")
    public ResponseEntity<ApiResponse<List<AvailabilityDto>>> getAvailabilities(@PathVariable UUID id) {
        List<AvailabilityDto> list = doctorService.getDoctorAvailabilities(id);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @Operation(summary = "Add or update doctor weekly availability schedule")
    @PostMapping("/{id}/availabilities")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<AvailabilityDto>> setAvailability(
            @PathVariable UUID id,
            @Valid @RequestBody CreateAvailabilityRequest request) {
        AvailabilityDto dto = doctorService.addOrUpdateAvailability(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(dto, "Availability saved successfully"));
    }

    @Operation(summary = "Remove an availability schedule window")
    @DeleteMapping("/{id}/availabilities/{availabilityId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAvailability(
            @PathVariable UUID id,
            @PathVariable UUID availabilityId) {
        doctorService.deleteAvailability(id, availabilityId);
        return ResponseEntity.ok(ApiResponse.messageOnly("Availability removed successfully"));
    }
}
