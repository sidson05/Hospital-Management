package com.hospital.hms.common.config;

import com.hospital.hms.modules.doctor.entity.Doctor;
import com.hospital.hms.modules.doctor.entity.DoctorAvailability;
import com.hospital.hms.modules.doctor.repository.DoctorAvailabilityRepository;
import com.hospital.hms.modules.doctor.repository.DoctorRepository;
import com.hospital.hms.modules.patient.entity.Patient;
import com.hospital.hms.modules.patient.repository.PatientRepository;
import com.hospital.hms.modules.user.entity.User;
import com.hospital.hms.modules.user.repository.UserRepository;
import com.hospital.hms.security.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorAvailabilityRepository availabilityRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded with user records.");
            return;
        }

        log.info("Seeding initial hospital users and schedule templates...");

        // 1. Seed Admin
        User adminUser = User.builder()
                .email("admin@hospital.com")
                .passwordHash(passwordEncoder.encode("AdminPassword123!"))
                .firstName("Hospital")
                .lastName("Administrator")
                .phoneNumber("+1-555-0100")
                .role(Role.ROLE_ADMIN)
                .isActive(true)
                .build();
        userRepository.save(adminUser);

        // 2. Seed Doctor 1 (Cardiologist)
        User doc1User = User.builder()
                .email("sarah.jenkins@hospital.com")
                .passwordHash(passwordEncoder.encode("DoctorPassword123!"))
                .firstName("Sarah")
                .lastName("Jenkins")
                .phoneNumber("+1-555-0101")
                .role(Role.ROLE_DOCTOR)
                .isActive(true)
                .build();
        userRepository.save(doc1User);

        Doctor doc1 = Doctor.builder()
                .user(doc1User)
                .specialization("CARDIOLOGY")
                .licenseNumber("MD-CARD-98412")
                .consultationFee(new BigDecimal("150.00"))
                .roomNumber("Room 304 - Wing B")
                .bio("Board-certified cardiologist with 12 years of clinical experience.")
                .experienceYears(12)
                .build();
        Doctor savedDoc1 = doctorRepository.save(doc1);

        // Add Mon-Fri 09:00 - 13:00 availability for Doc 1
        for (DayOfWeek day : List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)) {
            DoctorAvailability avail = DoctorAvailability.builder()
                    .doctor(savedDoc1)
                    .dayOfWeek(day)
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(13, 0))
                    .slotDurationMinutes(30)
                    .isActive(true)
                    .build();
            availabilityRepository.save(avail);
        }

        // 3. Seed Doctor 2 (Pediatrician)
        User doc2User = User.builder()
                .email("michael.chang@hospital.com")
                .passwordHash(passwordEncoder.encode("DoctorPassword123!"))
                .firstName("Michael")
                .lastName("Chang")
                .phoneNumber("+1-555-0102")
                .role(Role.ROLE_DOCTOR)
                .isActive(true)
                .build();
        userRepository.save(doc2User);

        Doctor doc2 = Doctor.builder()
                .user(doc2User)
                .specialization("PEDIATRICS")
                .licenseNumber("MD-PED-55129")
                .consultationFee(new BigDecimal("120.00"))
                .roomNumber("Room 102 - Wing A")
                .bio("Specialist in pediatric care and adolescent health.")
                .experienceYears(8)
                .build();
        Doctor savedDoc2 = doctorRepository.save(doc2);

        for (DayOfWeek day : List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY)) {
            DoctorAvailability avail = DoctorAvailability.builder()
                    .doctor(savedDoc2)
                    .dayOfWeek(day)
                    .startTime(LocalTime.of(14, 0))
                    .endTime(LocalTime.of(18, 0))
                    .slotDurationMinutes(30)
                    .isActive(true)
                    .build();
            availabilityRepository.save(avail);
        }

        // 4. Seed Patient
        User patientUser = User.builder()
                .email("patient@hospital.com")
                .passwordHash(passwordEncoder.encode("PatientPassword123!"))
                .firstName("John")
                .lastName("Doe")
                .phoneNumber("+1-555-0199")
                .role(Role.ROLE_PATIENT)
                .isActive(true)
                .build();
        userRepository.save(patientUser);

        Patient patient = Patient.builder()
                .user(patientUser)
                .dateOfBirth(LocalDate.of(1990, 5, 15))
                .gender("MALE")
                .bloodGroup("O+")
                .emergencyContact("+1-555-0999")
                .medicalHistorySummary("No known chronic illnesses. Penicillin allergy.")
                .build();
        patientRepository.save(patient);

        log.info("Default seed users created successfully.");
        log.info("-> Admin:   admin@hospital.com / AdminPassword123!");
        log.info("-> Doctor:  sarah.jenkins@hospital.com / DoctorPassword123!");
        log.info("-> Patient: patient@hospital.com / PatientPassword123!");
    }
}
