package com.hospital.hms.modules.appointment.service;

import com.hospital.hms.common.exception.BadRequestException;
import com.hospital.hms.common.exception.ResourceNotFoundException;
import com.hospital.hms.common.exception.SlotAlreadyBookedException;
import com.hospital.hms.common.exception.UnauthorizedException;
import com.hospital.hms.modules.appointment.dto.AppointmentResponse;
import com.hospital.hms.modules.appointment.dto.BookAppointmentRequest;
import com.hospital.hms.modules.appointment.dto.CancelRequest;
import com.hospital.hms.modules.appointment.dto.RescheduleRequest;
import com.hospital.hms.modules.appointment.entity.Appointment;
import com.hospital.hms.modules.appointment.entity.AppointmentStatus;
import com.hospital.hms.modules.appointment.event.AppointmentBookedEvent;
import com.hospital.hms.modules.appointment.repository.AppointmentRepository;
import com.hospital.hms.modules.audit.service.AuditService;
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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorAvailabilityRepository availabilityRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditService auditService;

    @Transactional
    public AppointmentResponse bookAppointment(UUID patientUserId, BookAppointmentRequest request) {
        Patient patient = patientRepository.findByUserId(patientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found for user: " + patientUserId));

        Doctor doctor = doctorRepository.findByIdWithLock(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + request.getDoctorId()));

        Instant slotStartTime = request.getSlotStartTime();
        if (slotStartTime.isBefore(Instant.now())) {
            throw new BadRequestException("Cannot book appointment slots in the past.");
        }

        // Validate that doctor works on this day and time window
        ZonedDateTime zdt = slotStartTime.atZone(ZoneOffset.UTC);
        DayOfWeek dayOfWeek = zdt.getDayOfWeek();
        LocalTime slotLocalTime = zdt.toLocalTime();

        DoctorAvailability availability = availabilityRepository
                .findByDoctorIdAndDayOfWeekAndIsActiveTrue(doctor.getId(), dayOfWeek)
                .orElseThrow(() -> new BadRequestException("Doctor is not scheduled to work on " + dayOfWeek));

        if (slotLocalTime.isBefore(availability.getStartTime()) ||
            slotLocalTime.plusMinutes(availability.getSlotDurationMinutes()).isAfter(availability.getEndTime())) {
            throw new BadRequestException(String.format(
                    "Selected time is outside doctor's working window (%s - %s).",
                    availability.getStartTime(), availability.getEndTime()));
        }

        // Fast-fail concurrency check: verify no active booking currently occupies this slot
        boolean alreadyBooked = appointmentRepository.existsByDoctorIdAndSlotStartTimeAndStatusNot(
                doctor.getId(), slotStartTime, AppointmentStatus.CANCELLED);

        if (alreadyBooked) {
            throw new SlotAlreadyBookedException("This time slot is already booked for Dr. " + doctor.getUser().getFullName());
        }

        Instant slotEndTime = slotStartTime.plus(Duration.ofMinutes(availability.getSlotDurationMinutes()));
        String activeBookingToken = doctor.getId().toString() + "_" + slotStartTime.toString();

        Appointment appointment = Appointment.builder()
                .doctor(doctor)
                .patient(patient)
                .slotStartTime(slotStartTime)
                .slotEndTime(slotEndTime)
                .status(AppointmentStatus.BOOKED)
                .activeBookingToken(activeBookingToken)
                .build();

        // The save triggers database constraint checks and JPA versioning
        Appointment saved = appointmentRepository.save(appointment);

        // Record audit
        auditService.logAction(
                "APPOINTMENT",
                saved.getId(),
                "BOOKED",
                patient.getUser().getEmail(),
                "Booked appointment with Dr. " + doctor.getUser().getFullName() + " at " + slotStartTime
        );

        // Publish event for decoupled async email notification
        eventPublisher.publishEvent(AppointmentBookedEvent.builder()
                .appointmentId(saved.getId())
                .doctorName(doctor.getUser().getFullName())
                .doctorSpecialization(doctor.getSpecialization())
                .patientName(patient.getUser().getFullName())
                .patientEmail(patient.getUser().getEmail())
                .slotStartTime(saved.getSlotStartTime())
                .slotEndTime(saved.getSlotEndTime())
                .build());

        log.info("Successfully booked appointment {} for patient {}", saved.getId(), patient.getId());
        return mapToResponse(saved);
    }

    @Transactional
    public AppointmentResponse rescheduleAppointment(UUID appointmentId, UUID currentUserId, RescheduleRequest request) {
        Appointment appointment = appointmentRepository.findByIdWithDetails(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + appointmentId));

        validateUserCanModify(appointment, currentUserId);

        if (appointment.getStatus() != AppointmentStatus.BOOKED) {
            throw new BadRequestException("Only BOOKED appointments can be rescheduled. Current status: " + appointment.getStatus());
        }

        Instant newSlotStartTime = request.getNewSlotStartTime();
        if (newSlotStartTime.isBefore(Instant.now())) {
            throw new BadRequestException("Cannot reschedule to a slot in the past.");
        }

        // Check if target slot is already occupied
        boolean alreadyBooked = appointmentRepository.existsByDoctorIdAndSlotStartTimeAndStatusNot(
                appointment.getDoctor().getId(), newSlotStartTime, AppointmentStatus.CANCELLED);

        if (alreadyBooked) {
            throw new SlotAlreadyBookedException("Target time slot is already booked for Dr. " + appointment.getDoctor().getUser().getFullName());
        }

        Duration duration = Duration.between(appointment.getSlotStartTime(), appointment.getSlotEndTime());
        appointment.setSlotStartTime(newSlotStartTime);
        appointment.setSlotEndTime(newSlotStartTime.plus(duration));
        appointment.setActiveBookingToken(appointment.getDoctor().getId().toString() + "_" + newSlotStartTime.toString());

        Appointment updated = appointmentRepository.save(appointment);

        auditService.logAction(
                "APPOINTMENT",
                updated.getId(),
                "RESCHEDULED",
                currentUserId.toString(),
                "Rescheduled appointment to " + newSlotStartTime
        );

        return mapToResponse(updated);
    }

    @Transactional
    public AppointmentResponse cancelAppointment(UUID appointmentId, UUID currentUserId, CancelRequest request) {
        Appointment appointment = appointmentRepository.findByIdWithDetails(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + appointmentId));

        validateUserCanModify(appointment, currentUserId);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Appointment is already cancelled.");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel an appointment that has already been completed.");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancellationReason(request.getReason());
        appointment.setActiveBookingToken(null);

        Appointment cancelled = appointmentRepository.save(appointment);

        auditService.logAction(
                "APPOINTMENT",
                cancelled.getId(),
                "CANCELLED",
                currentUserId.toString(),
                "Cancelled reason: " + request.getReason()
        );

        log.info("Cancelled appointment {}. Slot {} is now free for booking.", appointmentId, cancelled.getSlotStartTime());
        return mapToResponse(cancelled);
    }

    @Transactional
    public AppointmentResponse updateStatus(UUID appointmentId, UUID currentUserId, AppointmentStatus newStatus) {
        Appointment appointment = appointmentRepository.findByIdWithDetails(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + appointmentId));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        boolean isDoctor = appointment.getDoctor().getUser().getId().equals(currentUserId);
        boolean isAdmin = currentUser.getRole() == Role.ROLE_ADMIN;

        if (!isDoctor && !isAdmin) {
            throw new UnauthorizedException("Only the assigned doctor or an admin can update consultation status.");
        }

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Cannot change status of a cancelled appointment.");
        }

        appointment.setStatus(newStatus);
        Appointment updated = appointmentRepository.save(appointment);

        auditService.logAction(
                "APPOINTMENT",
                updated.getId(),
                "STATUS_UPDATE",
                currentUser.getEmail(),
                "Status updated to: " + newStatus
        );

        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(UUID appointmentId, UUID currentUserId) {
        Appointment appointment = appointmentRepository.findByIdWithDetails(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + appointmentId));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        boolean isPatient = appointment.getPatient().getUser().getId().equals(currentUserId);
        boolean isDoctor = appointment.getDoctor().getUser().getId().equals(currentUserId);
        boolean isAdmin = currentUser.getRole() == Role.ROLE_ADMIN;

        if (!isPatient && !isDoctor && !isAdmin) {
            throw new UnauthorizedException("You are not authorized to view this appointment.");
        }

        return mapToResponse(appointment);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getMyAppointments(UUID currentUserId) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (user.getRole() == Role.ROLE_PATIENT) {
            Patient patient = patientRepository.findByUserId(currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
            return appointmentRepository.findAllByPatientIdWithDetails(patient.getId())
                    .stream().map(this::mapToResponse).collect(Collectors.toList());
        } else if (user.getRole() == Role.ROLE_DOCTOR) {
            Doctor doctor = doctorRepository.findByUserId(currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
            return appointmentRepository.findAllByDoctorIdWithDetails(doctor.getId())
                    .stream().map(this::mapToResponse).collect(Collectors.toList());
        }

        return List.of();
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getDoctorAppointments(UUID doctorId) {
        return appointmentRepository.findAllByDoctorIdWithDetails(doctorId)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private void validateUserCanModify(Appointment appointment, UUID currentUserId) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        boolean isPatient = appointment.getPatient().getUser().getId().equals(currentUserId);
        boolean isDoctor = appointment.getDoctor().getUser().getId().equals(currentUserId);
        boolean isAdmin = currentUser.getRole() == Role.ROLE_ADMIN;

        if (!isPatient && !isDoctor && !isAdmin) {
            throw new UnauthorizedException("You do not have permission to modify this appointment.");
        }
    }

    private AppointmentResponse mapToResponse(Appointment a) {
        return AppointmentResponse.builder()
                .id(a.getId())
                .doctorId(a.getDoctor().getId())
                .doctorName(a.getDoctor().getUser().getFullName())
                .doctorSpecialization(a.getDoctor().getSpecialization())
                .roomNumber(a.getDoctor().getRoomNumber())
                .patientId(a.getPatient().getId())
                .patientName(a.getPatient().getUser().getFullName())
                .patientEmail(a.getPatient().getUser().getEmail())
                .patientPhone(a.getPatient().getUser().getPhoneNumber())
                .slotStartTime(a.getSlotStartTime())
                .slotEndTime(a.getSlotEndTime())
                .status(a.getStatus())
                .cancellationReason(a.getCancellationReason())
                .version(a.getVersion())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
