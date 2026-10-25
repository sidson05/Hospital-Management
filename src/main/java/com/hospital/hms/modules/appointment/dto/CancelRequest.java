package com.hospital.hms.modules.appointment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelRequest {

    @NotBlank(message = "Cancellation reason is required")
    @Size(min = 3, max = 500, message = "Reason must be between 3 and 500 characters")
    private String reason;
}
