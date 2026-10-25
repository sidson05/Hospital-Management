package com.hospital.hms.modules.patient.service;

import com.hospital.hms.common.exception.ResourceNotFoundException;
import com.hospital.hms.modules.patient.dto.PatientDto;
import com.hospital.hms.modules.patient.dto.UpdatePatientProfileRequest;
import com.hospital.hms.modules.patient.entity.Patient;
import com.hospital.hms.modules.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;

    @Transactional(readOnly = true)
    public PatientDto getPatientById(UUID id) {
        Patient patient = patientRepository.findByIdWithUser(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + id));
        return mapToDto(patient);
    }

    @Transactional(readOnly = true)
    public PatientDto getPatientByUserId(UUID userId) {
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found for user id: " + userId));
        return mapToDto(patient);
    }

    @Transactional
    public PatientDto updateProfile(UUID patientId, UpdatePatientProfileRequest request) {
        Patient patient = patientRepository.findByIdWithUser(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        if (request.getDateOfBirth() != null) {
            patient.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getGender() != null) {
            patient.setGender(request.getGender());
        }
        if (request.getBloodGroup() != null) {
            patient.setBloodGroup(request.getBloodGroup());
        }
        if (request.getEmergencyContact() != null) {
            patient.setEmergencyContact(request.getEmergencyContact());
        }
        if (request.getMedicalHistorySummary() != null) {
            patient.setMedicalHistorySummary(request.getMedicalHistorySummary());
        }

        Patient updated = patientRepository.save(patient);
        return mapToDto(updated);
    }

    private PatientDto mapToDto(Patient p) {
        return PatientDto.builder()
                .id(p.getId())
                .userId(p.getUser().getId())
                .fullName(p.getUser().getFullName())
                .email(p.getUser().getEmail())
                .phoneNumber(p.getUser().getPhoneNumber())
                .dateOfBirth(p.getDateOfBirth())
                .gender(p.getGender())
                .bloodGroup(p.getBloodGroup())
                .emergencyContact(p.getEmergencyContact())
                .medicalHistorySummary(p.getMedicalHistorySummary())
                .build();
    }
}
