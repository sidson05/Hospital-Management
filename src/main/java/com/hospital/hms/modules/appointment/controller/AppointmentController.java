package com.hospital.hms.modules.appointment.controller;

import com.hospital.hms.common.api.ApiResponse;
import com.hospital.hms.modules.appointment.dto.AppointmentResponse;
import com.hospital.hms.modules.appointment.dto.BookAppointmentRequest;
import com.hospital.hms.modules.appointment.dto.CancelRequest;
import com.hospital.hms.modules.appointment.dto.RescheduleRequest;
import com.hospital.hms.modules.appointment.entity.AppointmentStatus;
import com.hospital.hms.modules.appointment.service.AppointmentService;
import com.hospital.hms.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/appointments")
@RequiredArgsConstructor
@Tag(name = "Appointment Scheduling", description = "Endpoints for slot booking, rescheduling, cancellations, and status transitions")
public class AppointmentController {

    private final AppointmentService appointmentService;

    @Operation(summary = "Book an appointment slot with a doctor (Patient only)")
    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> bookAppointment(
            @Valid @RequestBody BookAppointmentRequest request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AppointmentResponse response = appointmentService.bookAppointment(currentUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Appointment successfully booked. Confirmation email dispatched."));
    }

    @Operation(summary = "Get list of appointments for the current authenticated user")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getMyAppointments() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        List<AppointmentResponse> list = appointmentService.getMyAppointments(currentUserId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @Operation(summary = "Get single appointment details by appointment ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AppointmentResponse>> getAppointmentById(@PathVariable UUID id) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AppointmentResponse response = appointmentService.getAppointmentById(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Reschedule an existing booked appointment to a new slot")
    @PatchMapping("/{id}/reschedule")
    public ResponseEntity<ApiResponse<AppointmentResponse>> rescheduleAppointment(
            @PathVariable UUID id,
            @Valid @RequestBody RescheduleRequest request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AppointmentResponse response = appointmentService.rescheduleAppointment(id, currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Appointment successfully rescheduled"));
    }

    @Operation(summary = "Cancel an appointment with a stated reason")
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<AppointmentResponse>> cancelAppointment(
            @PathVariable UUID id,
            @Valid @RequestBody CancelRequest request) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AppointmentResponse response = appointmentService.cancelAppointment(id, currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Appointment cancelled successfully. Slot freed."));
    }

    @Operation(summary = "Update consultation status (COMPLETED or NO_SHOW) - Doctors and Admins only")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> updateStatus(
            @PathVariable UUID id,
            @RequestParam AppointmentStatus status) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        AppointmentResponse response = appointmentService.updateStatus(id, currentUserId, status);
        return ResponseEntity.ok(ApiResponse.success(response, "Appointment status updated to " + status));
    }

    @Operation(summary = "Get all appointments for a specific doctor (Doctor or Admin only)")
    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getDoctorAppointments(
            @PathVariable UUID doctorId) {
        List<AppointmentResponse> list = appointmentService.getDoctorAppointments(doctorId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
