package com.hospital.hms.modules.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyReportDto {

    private LocalDate date;
    private long totalAppointments;
    private long bookedCount;
    private long completedCount;
    private long cancelledCount;
    private long noShowCount;
    private double cancellationRatePercentage;
}
