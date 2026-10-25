package com.hospital.hms.modules.doctor.repository;

import com.hospital.hms.modules.doctor.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, UUID> {

    Optional<Doctor> findByUserId(UUID userId);

    Optional<Doctor> findByLicenseNumber(String licenseNumber);

    boolean existsByLicenseNumber(String licenseNumber);

    @jakarta.persistence.LockModeType.PESSIMISTIC_WRITE
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Doctor d WHERE d.id = :id")
    Optional<Doctor> findByIdWithLock(@Param("id") UUID id);

    @Query("SELECT d FROM Doctor d JOIN FETCH d.user u WHERE LOWER(d.specialization) = LOWER(:specialization) AND u.isActive = true")
    List<Doctor> findAllBySpecializationIgnoreCase(@Param("specialization") String specialization);

    @Query("SELECT d FROM Doctor d JOIN FETCH d.user u WHERE u.isActive = true")
    List<Doctor> findAllActiveDoctors();
}
