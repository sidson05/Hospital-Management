package com.hospital.hms.modules.appointment.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescheduleRequest {

    @NotNull(message = "New slot start time is required")
    @Future(message = "New slot start time must be in the future")
    private Instant newSlotStartTime;
}
