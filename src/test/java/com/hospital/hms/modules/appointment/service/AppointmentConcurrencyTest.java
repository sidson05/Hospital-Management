package com.hospital.hms.modules.appointment.service;

import com.hospital.hms.common.exception.SlotAlreadyBookedException;
import com.hospital.hms.modules.appointment.dto.BookAppointmentRequest;
import com.hospital.hms.modules.appointment.entity.Appointment;
import com.hospital.hms.modules.appointment.entity.AppointmentStatus;
import com.hospital.hms.modules.appointment.repository.AppointmentRepository;
import com.hospital.hms.modules.doctor.entity.Doctor;
import com.hospital.hms.modules.doctor.entity.DoctorAvailability;
import com.hospital.hms.modules.doctor.repository.DoctorAvailabilityRepository;
import com.hospital.hms.modules.doctor.repository.DoctorRepository;
import com.hospital.hms.modules.patient.entity.Patient;
import com.hospital.hms.modules.patient.repository.PatientRepository;
import com.hospital.hms.modules.user.entity.User;
import com.hospital.hms.modules.user.repository.UserRepository;
import com.hospital.hms.security.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class AppointmentConcurrencyTest {

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private DoctorAvailabilityRepository availabilityRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private UserRepository userRepository;

    @org.springframework.boot.test.mock.mockito.MockBean
    private org.springframework.mail.javamail.JavaMailSender mailSender;

    private Doctor savedDoctor;
    private List<User> patientUsers;
    private Instant targetSlotStartTime;

    @BeforeEach
    void setUp() {
        appointmentRepository.deleteAll();
        availabilityRepository.deleteAll();
        doctorRepository.deleteAll();
        patientRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Setup Doctor with availability on next Monday
        User doctorUser = userRepository.save(User.builder()
                .email("concurrent.doctor@hospital.com")
                .passwordHash("hashed")
                .firstName("Gregory")
                .lastName("House")
                .role(Role.ROLE_DOCTOR)
                .isActive(true)
                .build());

        savedDoctor = doctorRepository.save(Doctor.builder()
                .user(doctorUser)
                .specialization("NEUROLOGY")
                .licenseNumber("MD-NEURO-7711")
                .consultationFee(new BigDecimal("200.00"))
                .experienceYears(15)
                .build());

        availabilityRepository.save(DoctorAvailability.builder()
                .doctor(savedDoctor)
                .dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .slotDurationMinutes(30)
                .isActive(true)
                .build());

        // Target: next Monday at 09:00 UTC
        LocalDate nextMonday = LocalDate.now().plusWeeks(1);
        while (nextMonday.getDayOfWeek() != DayOfWeek.MONDAY) {
            nextMonday = nextMonday.plusDays(1);
        }
        targetSlotStartTime = nextMonday.atTime(9, 0).atZone(ZoneOffset.UTC).toInstant();

        // 2. Setup 10 distinct Patients
        patientUsers = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            User pUser = userRepository.save(User.builder()
                    .email("patient" + i + "@test.com")
                    .passwordHash("hashed")
                    .firstName("Patient")
                    .lastName("#" + i)
                    .role(Role.ROLE_PATIENT)
                    .isActive(true)
                    .build());

            patientRepository.save(Patient.builder()
                    .user(pUser)
                    .build());

            patientUsers.add(pUser);
        }
    }

    @Test
    @DisplayName("Concurrency: 10 parallel threads attempting to book the same slot must yield strictly 1 booking")
    void testConcurrentBookingForSameSlotPreventsDoubleBooking() throws InterruptedException {
        int threadCount = 10;
        ExecutorService executorService = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCounter = new AtomicInteger(0);
        AtomicInteger conflictCounter = new AtomicInteger(0);
        AtomicInteger unexpectedErrorCounter = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final UUID patientUserId = patientUsers.get(i).getId();

            executorService.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await(); // Synchronize all threads to fire simultaneously

                    BookAppointmentRequest request = BookAppointmentRequest.builder()
                            .doctorId(savedDoctor.getId())
                            .slotStartTime(targetSlotStartTime)
                            .build();

                    appointmentService.bookAppointment(patientUserId, request);
                    successCounter.incrementAndGet();
                } catch (SlotAlreadyBookedException | DataIntegrityViolationException | ObjectOptimisticLockingFailureException ex) {
                    conflictCounter.incrementAndGet();
                } catch (Exception ex) {
                    unexpectedErrorCounter.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await();
        startLatch.countDown(); // Fire all 10 threads at once
        doneLatch.await();
        executorService.shutdown();

        // Assertions:
        // Strictly 1 thread succeeded
        assertThat(successCounter.get()).isEqualTo(1);
        // Exactly 9 threads were rejected due to conflict / concurrency prevention
        assertThat(conflictCounter.get()).isEqualTo(9);
        assertThat(unexpectedErrorCounter.get()).isEqualTo(0);

        // Verify strictly 1 appointment was committed to the database
        List<Appointment> savedAppointments = appointmentRepository
                .findAllByDoctorIdAndSlotStartTimeBetweenAndStatusNot(
                        savedDoctor.getId(),
                        targetSlotStartTime.minusSeconds(60),
                        targetSlotStartTime.plusSeconds(60),
                        AppointmentStatus.CANCELLED
                );

        assertThat(savedAppointments).hasSize(1);
        assertThat(savedAppointments.get(0).getStatus()).isEqualTo(AppointmentStatus.BOOKED);
        assertThat(savedAppointments.get(0).getSlotStartTime()).isEqualTo(targetSlotStartTime);
    }
}
