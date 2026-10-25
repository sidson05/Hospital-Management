package com.hospital.hms.modules.admin.service;

import com.hospital.hms.modules.admin.dto.BusiestDoctorDto;
import com.hospital.hms.modules.admin.dto.DailyReportDto;
import com.hospital.hms.modules.appointment.entity.AppointmentStatus;
import com.hospital.hms.modules.appointment.repository.AppointmentRepository;
import com.hospital.hms.modules.doctor.entity.Doctor;
import com.hospital.hms.modules.doctor.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminReportService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;

    @Transactional(readOnly = true)
    public DailyReportDto getDailyReport(LocalDate date) {
        Instant dayStart = date.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant dayEnd = date.atTime(LocalTime.MAX).atZone(ZoneOffset.UTC).toInstant();

        long total = appointmentRepository.countBySlotStartTimeBetween(dayStart, dayEnd);
        long booked = appointmentRepository.countBySlotStartTimeBetweenAndStatus(dayStart, dayEnd, AppointmentStatus.BOOKED);
        long completed = appointmentRepository.countBySlotStartTimeBetweenAndStatus(dayStart, dayEnd, AppointmentStatus.COMPLETED);
        long cancelled = appointmentRepository.countBySlotStartTimeBetweenAndStatus(dayStart, dayEnd, AppointmentStatus.CANCELLED);
        long noShow = appointmentRepository.countBySlotStartTimeBetweenAndStatus(dayStart, dayEnd, AppointmentStatus.NO_SHOW);

        double cancellationRate = total > 0 ? ((double) cancelled / total) * 100.0 : 0.0;

        return DailyReportDto.builder()
                .date(date)
                .totalAppointments(total)
                .bookedCount(booked)
                .completedCount(completed)
                .cancelledCount(cancelled)
                .noShowCount(noShow)
                .cancellationRatePercentage(Math.round(cancellationRate * 100.0) / 100.0)
                .build();
    }

    @Transactional(readOnly = true)
    public List<BusiestDoctorDto> getBusiestDoctors(LocalDate startDate, LocalDate endDate, int limit) {
        Instant start = startDate.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant end = endDate.atTime(LocalTime.MAX).atZone(ZoneOffset.UTC).toInstant();

        List<Object[]> results = appointmentRepository.findBusiestDoctors(start, end);
        List<BusiestDoctorDto> dtoList = new ArrayList<>();

        for (int i = 0; i < Math.min(results.size(), limit); i++) {
            Object[] row = results.get(i);
            UUID doctorId = (UUID) row[0];
            long count = ((Number) row[1]).longValue();

            Doctor doctor = doctorRepository.findById(doctorId).orElse(null);
            if (doctor != null) {
                dtoList.add(BusiestDoctorDto.builder()
                        .doctorId(doctorId)
                        .doctorName(doctor.getUser().getFullName())
                        .specialization(doctor.getSpecialization())
                        .appointmentCount(count)
                        .build());
            }
        }

        return dtoList;
    }
}
