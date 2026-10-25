package com.hospital.hms.modules.user.dto;

import com.hospital.hms.security.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 64, message = "Password must be between 8 and 64 characters")
    private String password;

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @Pattern(regexp = "^\\+?[0-9. ()-]{7,25}$", message = "Phone number format is invalid")
    private String phoneNumber;

    @NotNull(message = "Role is required")
    private Role role; // PATIENT or DOCTOR

    // Doctor profile specifics (required only if role is DOCTOR)
    private String specialization;
    private String licenseNumber;
    private java.math.BigDecimal consultationFee;
    private String roomNumber;
    private String bio;
    private Integer experienceYears;
}
