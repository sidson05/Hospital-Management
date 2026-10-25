package com.hospital.hms.modules.user.dto;

import com.hospital.hms.security.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private UUID userId;
    private String email;
    private String fullName;
    private Role role;
    private UUID profileId; // doctorId or patientId
}
