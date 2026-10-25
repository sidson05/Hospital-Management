package com.hospital.hms.modules.doctor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorDto {

    private UUID id;
    private UUID userId;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String specialization;
    private String licenseNumber;
    private BigDecimal consultationFee;
    private String roomNumber;
    private String bio;
    private int experienceYears;
    private List<AvailabilityDto> availabilities;
}
