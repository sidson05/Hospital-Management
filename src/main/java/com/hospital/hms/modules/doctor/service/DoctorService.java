package com.hospital.hms.modules.doctor.service;

import com.hospital.hms.common.exception.BadRequestException;
import com.hospital.hms.common.exception.ResourceNotFoundException;
import com.hospital.hms.modules.doctor.dto.AvailabilityDto;
import com.hospital.hms.modules.doctor.dto.CreateAvailabilityRequest;
import com.hospital.hms.modules.doctor.dto.CreateDoctorRequest;
import com.hospital.hms.modules.doctor.dto.DoctorDto;
import com.hospital.hms.modules.doctor.entity.Doctor;
import com.hospital.hms.modules.doctor.entity.DoctorAvailability;
import com.hospital.hms.modules.doctor.repository.DoctorAvailabilityRepository;
import com.hospital.hms.modules.doctor.repository.DoctorRepository;
import com.hospital.hms.modules.user.entity.User;
import com.hospital.hms.modules.user.repository.UserRepository;
import com.hospital.hms.security.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final DoctorAvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<DoctorDto> getAllDoctors(String specialization) {
        List<Doctor> doctors = (specialization != null && !specialization.isBlank())
                ? doctorRepository.findAllBySpecializationIgnoreCase(specialization.trim())
                : doctorRepository.findAllActiveDoctors();

        return doctors.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DoctorDto getDoctorById(UUID id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + id));
        return mapToDto(doctor);
    }

    @Transactional(readOnly = true)
    public DoctorDto getDoctorByUserId(UUID userId) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found for user id: " + userId));
        return mapToDto(doctor);
    }

    @Transactional
    public DoctorDto createDoctor(CreateDoctorRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BadRequestException("Email " + request.getEmail() + " is already registered.");
        }
        if (doctorRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new BadRequestException("License number " + request.getLicenseNumber() + " already exists.");
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .phoneNumber(request.getPhoneNumber())
                .role(Role.ROLE_DOCTOR)
                .isActive(true)
                .build();
        User savedUser = userRepository.save(user);

        Doctor doctor = Doctor.builder()
                .user(savedUser)
                .specialization(request.getSpecialization().trim())
                .licenseNumber(request.getLicenseNumber().trim())
                .consultationFee(request.getConsultationFee())
                .roomNumber(request.getRoomNumber())
                .bio(request.getBio())
                .experienceYears(request.getExperienceYears())
                .build();

        Doctor savedDoctor = doctorRepository.save(doctor);
        return mapToDto(savedDoctor);
    }

    @Transactional
    public AvailabilityDto addOrUpdateAvailability(UUID doctorId, CreateAvailabilityRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));

        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new BadRequestException("Start time must be strictly before end time.");
        }

        DoctorAvailability availability = availabilityRepository
                .findByDoctorIdAndDayOfWeekAndIsActiveTrue(doctorId, request.getDayOfWeek())
                .orElse(DoctorAvailability.builder()
                        .doctor(doctor)
                        .dayOfWeek(request.getDayOfWeek())
                        .build());

        availability.setStartTime(request.getStartTime());
        availability.setEndTime(request.getEndTime());
        availability.setSlotDurationMinutes(request.getSlotDurationMinutes());
        availability.setActive(true);

        DoctorAvailability saved = availabilityRepository.save(availability);
        return mapAvailabilityToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<AvailabilityDto> getDoctorAvailabilities(UUID doctorId) {
        if (!doctorRepository.existsById(doctorId)) {
            throw new ResourceNotFoundException("Doctor not found with id: " + doctorId);
        }
        return availabilityRepository.findAllByDoctorIdAndIsActiveTrue(doctorId)
                .stream()
                .map(this::mapAvailabilityToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteAvailability(UUID doctorId, UUID availabilityId) {
        DoctorAvailability availability = availabilityRepository.findById(availabilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Availability record not found with id: " + availabilityId));

        if (!availability.getDoctor().getId().equals(doctorId)) {
            throw new BadRequestException("Availability record does not belong to the specified doctor.");
        }

        availabilityRepository.delete(availability);
    }

    private DoctorDto mapToDto(Doctor doctor) {
        List<AvailabilityDto> availabilities = availabilityRepository
                .findAllByDoctorIdAndIsActiveTrue(doctor.getId())
                .stream()
                .map(this::mapAvailabilityToDto)
                .collect(Collectors.toList());

        return DoctorDto.builder()
                .id(doctor.getId())
                .userId(doctor.getUser().getId())
                .fullName(doctor.getUser().getFullName())
                .email(doctor.getUser().getEmail())
                .phoneNumber(doctor.getUser().getPhoneNumber())
                .specialization(doctor.getSpecialization())
                .licenseNumber(doctor.getLicenseNumber())
                .consultationFee(doctor.getConsultationFee())
                .roomNumber(doctor.getRoomNumber())
                .bio(doctor.getBio())
                .experienceYears(doctor.getExperienceYears())
                .availabilities(availabilities)
                .build();
    }

    private AvailabilityDto mapAvailabilityToDto(DoctorAvailability a) {
        return AvailabilityDto.builder()
                .id(a.getId())
                .dayOfWeek(a.getDayOfWeek())
                .startTime(a.getStartTime())
                .endTime(a.getEndTime())
                .slotDurationMinutes(a.getSlotDurationMinutes())
                .active(a.isActive())
                .build();
    }
}
