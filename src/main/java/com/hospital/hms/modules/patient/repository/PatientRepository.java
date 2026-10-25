package com.hospital.hms.modules.patient.repository;

import com.hospital.hms.modules.patient.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByUserId(UUID userId);

    @Query("SELECT p FROM Patient p JOIN FETCH p.user u WHERE p.id = :id")
    Optional<Patient> findByIdWithUser(@Param("id") UUID id);
}
