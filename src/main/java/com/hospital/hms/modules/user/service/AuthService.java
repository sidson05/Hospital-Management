package com.hospital.hms.modules.user.service;

import com.hospital.hms.common.exception.BadRequestException;
import com.hospital.hms.modules.doctor.entity.Doctor;
import com.hospital.hms.modules.doctor.repository.DoctorRepository;
import com.hospital.hms.modules.patient.entity.Patient;
import com.hospital.hms.modules.patient.repository.PatientRepository;
import com.hospital.hms.modules.user.dto.AuthResponse;
import com.hospital.hms.modules.user.dto.LoginRequest;
import com.hospital.hms.modules.user.dto.RegisterRequest;
import com.hospital.hms.modules.user.entity.User;
import com.hospital.hms.modules.user.repository.UserRepository;
import com.hospital.hms.security.JwtTokenProvider;
import com.hospital.hms.security.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BadRequestException("An account with email " + request.getEmail() + " already exists.");
        }

        if (request.getRole() == Role.ROLE_ADMIN) {
            throw new BadRequestException("Self-registration as ADMIN is not permitted.");
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .phoneNumber(request.getPhoneNumber())
                .role(request.getRole())
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);
        UUID profileId = null;

        if (request.getRole() == Role.ROLE_DOCTOR) {
            if (request.getLicenseNumber() == null || request.getLicenseNumber().isBlank()) {
                throw new BadRequestException("Medical license number is required for doctor registration.");
            }
            if (doctorRepository.existsByLicenseNumber(request.getLicenseNumber())) {
                throw new BadRequestException("A doctor with license number " + request.getLicenseNumber() + " already exists.");
            }

            Doctor doctor = Doctor.builder()
                    .user(savedUser)
                    .specialization(request.getSpecialization() != null ? request.getSpecialization() : "GENERAL_MEDICINE")
                    .licenseNumber(request.getLicenseNumber().trim())
                    .consultationFee(request.getConsultationFee() != null ? request.getConsultationFee() : BigDecimal.ZERO)
                    .roomNumber(request.getRoomNumber())
                    .bio(request.getBio())
                    .experienceYears(request.getExperienceYears() != null ? request.getExperienceYears() : 0)
                    .build();
            Doctor savedDoctor = doctorRepository.save(doctor);
            profileId = savedDoctor.getId();
        } else if (request.getRole() == Role.ROLE_PATIENT) {
            Patient patient = Patient.builder()
                    .user(savedUser)
                    .build();
            Patient savedPatient = patientRepository.save(patient);
            profileId = savedPatient.getId();
        }

        String token = jwtTokenProvider.generateToken(
                savedUser.getId(), savedUser.getEmail(), savedUser.getRole(), savedUser.getFullName());

        log.info("Registered new user with ID: {}, Role: {}", savedUser.getId(), savedUser.getRole());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .role(savedUser.getRole())
                .profileId(profileId)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail().toLowerCase().trim(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmailIgnoreCase(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new BadRequestException("Invalid email or password."));

        UUID profileId = null;
        if (user.getRole() == Role.ROLE_DOCTOR) {
            profileId = doctorRepository.findByUserId(user.getId())
                    .map(Doctor::getId).orElse(null);
        } else if (user.getRole() == Role.ROLE_PATIENT) {
            profileId = patientRepository.findByUserId(user.getId())
                    .map(Patient::getId).orElse(null);
        }

        String token = jwtTokenProvider.generateToken(
                user.getId(), user.getEmail(), user.getRole(), user.getFullName());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .profileId(profileId)
                .build();
    }
}
