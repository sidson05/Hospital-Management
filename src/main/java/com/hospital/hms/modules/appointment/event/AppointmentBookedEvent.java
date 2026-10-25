package com.hospital.hms.modules.appointment.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class AppointmentBookedEvent {

    private final UUID appointmentId;
    private final String doctorName;
    private final String doctorSpecialization;
    private final String patientName;
    private final String patientEmail;
    private final Instant slotStartTime;
    private final Instant slotEndTime;
}
