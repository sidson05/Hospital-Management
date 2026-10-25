package com.hospital.hms.modules.admin.controller;

import com.hospital.hms.common.api.ApiResponse;
import com.hospital.hms.modules.admin.dto.BusiestDoctorDto;
import com.hospital.hms.modules.admin.dto.DailyReportDto;
import com.hospital.hms.modules.admin.service.AdminReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Analytics & Reporting", description = "Endpoints for daily operational metrics, cancellation analysis, and doctor workloads")
public class AdminReportController {

    private final AdminReportService adminReportService;

    @Operation(summary = "Get daily appointment volume, completions, and cancellation rate")
    @GetMapping("/daily")
    public ResponseEntity<ApiResponse<DailyReportDto>> getDailyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        DailyReportDto report = adminReportService.getDailyReport(targetDate);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @Operation(summary = "Get list of top busiest doctors ranked by non-cancelled appointment volume")
    @GetMapping("/busiest-doctors")
    public ResponseEntity<ApiResponse<List<BusiestDoctorDto>>> getBusiestDoctors(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "5") int limit) {
        List<BusiestDoctorDto> list = adminReportService.getBusiestDoctors(startDate, endDate, limit);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
