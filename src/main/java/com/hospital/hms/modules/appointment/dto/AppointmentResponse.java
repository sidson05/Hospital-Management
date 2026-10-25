package com.hospital.hms.modules.appointment.dto;

import com.hospital.hms.modules.appointment.entity.AppointmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {

    private UUID id;
    private UUID doctorId;
    private String doctorName;
    private String doctorSpecialization;
    private String roomNumber;
    private UUID patientId;
    private String patientName;
    private String patientEmail;
    private String patientPhone;
    private Instant slotStartTime;
    private Instant slotEndTime;
    private AppointmentStatus status;
    private String cancellationReason;
    private Long version;
    private Instant createdAt;
}
