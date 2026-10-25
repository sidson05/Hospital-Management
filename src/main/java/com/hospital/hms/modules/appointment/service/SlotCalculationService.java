package com.hospital.hms.modules.appointment.service;

import com.hospital.hms.common.exception.ResourceNotFoundException;
import com.hospital.hms.modules.appointment.dto.TimeSlotResponse;
import com.hospital.hms.modules.appointment.entity.Appointment;
import com.hospital.hms.modules.appointment.entity.AppointmentStatus;
import com.hospital.hms.modules.appointment.repository.AppointmentRepository;
import com.hospital.hms.modules.doctor.entity.DoctorAvailability;
import com.hospital.hms.modules.doctor.repository.DoctorAvailabilityRepository;
import com.hospital.hms.modules.doctor.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlotCalculationService {

    private final DoctorRepository doctorRepository;
    private final DoctorAvailabilityRepository availabilityRepository;
    private final AppointmentRepository appointmentRepository;

    private static final ZoneId DEFAULT_ZONE = ZoneOffset.UTC;

    @Transactional(readOnly = true)
    public List<TimeSlotResponse> calculateSlotsForDate(UUID doctorId, LocalDate date) {
        if (!doctorRepository.existsById(doctorId)) {
            throw new ResourceNotFoundException("Doctor not found with id: " + doctorId);
        }

        // 1. Look up doctor's availability template for this day of week
        DoctorAvailability availability = availabilityRepository
                .findByDoctorIdAndDayOfWeekAndIsActiveTrue(doctorId, date.getDayOfWeek())
                .orElse(null);

        if (availability == null) {
            return Collections.emptyList();
        }

        // 2. Fetch existing active bookings for that doctor across the target date
        ZonedDateTime dayStart = date.atStartOfDay(DEFAULT_ZONE);
        ZonedDateTime dayEnd = date.atTime(LocalTime.MAX).atZone(DEFAULT_ZONE);

        List<Appointment> existingAppointments = appointmentRepository
                .findAllByDoctorIdAndSlotStartTimeBetweenAndStatusNot(
                        doctorId,
                        dayStart.toInstant(),
                        dayEnd.toInstant(),
                        AppointmentStatus.CANCELLED
                );

        Set<Instant> bookedStartTimes = existingAppointments.stream()
                .map(Appointment::getSlotStartTime)
                .collect(Collectors.toSet());

        // 3. Compute slot slices based on availability window and slot duration
        List<TimeSlotResponse> slots = new ArrayList<>();
        LocalTime current = availability.getStartTime();
        LocalTime endLimit = availability.getEndTime();
        int durationMinutes = availability.getSlotDurationMinutes();
        Instant now = Instant.now();

        while (current.plusMinutes(durationMinutes).isBefore(endLimit) ||
               current.plusMinutes(durationMinutes).equals(endLimit)) {

            LocalTime slotEnd = current.plusMinutes(durationMinutes);
            Instant slotStartInstant = date.atTime(current).atZone(DEFAULT_ZONE).toInstant();
            Instant slotEndInstant = date.atTime(slotEnd).atZone(DEFAULT_ZONE).toInstant();

            boolean isAlreadyBooked = bookedStartTimes.contains(slotStartInstant);
            boolean isPast = slotStartInstant.isBefore(now);

            boolean isAvailable = !isAlreadyBooked && !isPast;

            slots.add(TimeSlotResponse.builder()
                    .startTime(slotStartInstant)
                    .endTime(slotEndInstant)
                    .available(isAvailable)
                    .slotDurationMinutes(durationMinutes)
                    .build());

            current = slotEnd;
        }

        return slots;
    }
}
