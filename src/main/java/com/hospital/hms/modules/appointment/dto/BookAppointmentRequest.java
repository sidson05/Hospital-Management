package com.hospital.hms.modules.appointment.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
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
public class BookAppointmentRequest {

    @NotNull(message = "Doctor ID is required")
    private UUID doctorId;

    @NotNull(message = "Slot start time is required")
    @Future(message = "Slot start time must be in the future")
    private Instant slotStartTime;
}
