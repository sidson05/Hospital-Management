package com.hospital.hms.modules.doctor.repository;

import com.hospital.hms.modules.doctor.entity.DoctorAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorAvailabilityRepository extends JpaRepository<DoctorAvailability, UUID> {

    List<DoctorAvailability> findAllByDoctorIdAndIsActiveTrue(UUID doctorId);

    Optional<DoctorAvailability> findByDoctorIdAndDayOfWeekAndIsActiveTrue(UUID doctorId, DayOfWeek dayOfWeek);

    void deleteAllByDoctorId(UUID doctorId);
}
