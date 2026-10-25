package com.hospital.hms.modules.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusiestDoctorDto {

    private UUID doctorId;
    private String doctorName;
    private String specialization;
    private long appointmentCount;
}
