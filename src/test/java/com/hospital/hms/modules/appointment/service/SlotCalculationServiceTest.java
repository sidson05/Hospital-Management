package com.hospital.hms.modules.appointment.service;

import com.hospital.hms.modules.appointment.dto.TimeSlotResponse;
import com.hospital.hms.modules.appointment.entity.Appointment;
import com.hospital.hms.modules.appointment.entity.AppointmentStatus;
import com.hospital.hms.modules.appointment.repository.AppointmentRepository;
import com.hospital.hms.modules.doctor.entity.Doctor;
import com.hospital.hms.modules.doctor.entity.DoctorAvailability;
import com.hospital.hms.modules.doctor.repository.DoctorAvailabilityRepository;
import com.hospital.hms.modules.doctor.repository.DoctorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SlotCalculationServiceTest {

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private DoctorAvailabilityRepository availabilityRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @InjectMocks
    private SlotCalculationService slotCalculationService;

    private UUID doctorId;
    private LocalDate futureMonday;

    @BeforeEach
    void setUp() {
        doctorId = UUID.randomUUID();
        // A future Monday
        futureMonday = LocalDate.now().plusWeeks(2);
        while (futureMonday.getDayOfWeek() != DayOfWeek.MONDAY) {
            futureMonday = futureMonday.plusDays(1);
        }
    }

    @Test
    @DisplayName("Should generate correctly divided time slots when doctor has availability")
    void shouldGenerateCorrectSlotsForDoctor() {
        when(doctorRepository.existsById(doctorId)).thenReturn(true);

        DoctorAvailability availability = DoctorAvailability.builder()
                .dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .slotDurationMinutes(30)
                .isActive(true)
                .build();

        when(availabilityRepository.findByDoctorIdAndDayOfWeekAndIsActiveTrue(doctorId, DayOfWeek.MONDAY))
                .thenReturn(Optional.of(availability));

        when(appointmentRepository.findAllByDoctorIdAndSlotStartTimeBetweenAndStatusNot(
                eq(doctorId), any(), any(), eq(AppointmentStatus.CANCELLED)))
                .thenReturn(Collections.emptyList());

        List<TimeSlotResponse> slots = slotCalculationService.calculateSlotsForDate(doctorId, futureMonday);

        assertThat(slots).hasSize(4);
        assertThat(slots.get(0).isAvailable()).isTrue();
        assertThat(slots.get(0).getSlotDurationMinutes()).isEqualTo(30);
    }

    @Test
    @DisplayName("Should mark slot as unavailable when already occupied by active appointment")
    void shouldMarkSlotAsUnavailableWhenBooked() {
        when(doctorRepository.existsById(doctorId)).thenReturn(true);

        DoctorAvailability availability = DoctorAvailability.builder()
                .dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(10, 0))
                .slotDurationMinutes(30)
                .isActive(true)
                .build();

        when(availabilityRepository.findByDoctorIdAndDayOfWeekAndIsActiveTrue(doctorId, DayOfWeek.MONDAY))
                .thenReturn(Optional.of(availability));

        Appointment existingBooking = Appointment.builder()
                .slotStartTime(futureMonday.atTime(9, 0).atZone(ZoneOffset.UTC).toInstant())
                .slotEndTime(futureMonday.atTime(9, 30).atZone(ZoneOffset.UTC).toInstant())
                .status(AppointmentStatus.BOOKED)
                .build();

        when(appointmentRepository.findAllByDoctorIdAndSlotStartTimeBetweenAndStatusNot(
                eq(doctorId), any(), any(), eq(AppointmentStatus.CANCELLED)))
                .thenReturn(List.of(existingBooking));

        List<TimeSlotResponse> slots = slotCalculationService.calculateSlotsForDate(doctorId, futureMonday);

        assertThat(slots).hasSize(2);
        assertThat(slots.get(0).isAvailable()).isFalse(); // 09:00 booked
        assertThat(slots.get(1).isAvailable()).isTrue();  // 09:30 free
    }
}
