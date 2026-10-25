package com.hospital.hms.modules.appointment.repository;

import com.hospital.hms.modules.appointment.entity.Appointment;
import com.hospital.hms.modules.appointment.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    @Query("SELECT a FROM Appointment a " +
           "JOIN FETCH a.doctor d JOIN FETCH d.user " +
           "JOIN FETCH a.patient p JOIN FETCH p.user " +
           "WHERE a.id = :id")
    Optional<Appointment> findByIdWithDetails(@Param("id") UUID id);

    boolean existsByDoctorIdAndSlotStartTimeAndStatusNot(
            UUID doctorId, Instant slotStartTime, AppointmentStatus status);

    List<Appointment> findAllByDoctorIdAndSlotStartTimeBetweenAndStatusNot(
            UUID doctorId, Instant startTime, Instant endTime, AppointmentStatus status);

    @Query("SELECT a FROM Appointment a " +
           "JOIN FETCH a.doctor d JOIN FETCH d.user " +
           "JOIN FETCH a.patient p JOIN FETCH p.user " +
           "WHERE a.patient.id = :patientId ORDER BY a.slotStartTime DESC")
    List<Appointment> findAllByPatientIdWithDetails(@Param("patientId") UUID patientId);

    @Query("SELECT a FROM Appointment a " +
           "JOIN FETCH a.doctor d JOIN FETCH d.user " +
           "JOIN FETCH a.patient p JOIN FETCH p.user " +
           "WHERE a.doctor.id = :doctorId ORDER BY a.slotStartTime DESC")
    List<Appointment> findAllByDoctorIdWithDetails(@Param("doctorId") UUID doctorId);

    long countBySlotStartTimeBetween(Instant start, Instant end);

    long countBySlotStartTimeBetweenAndStatus(Instant start, Instant end, AppointmentStatus status);

    @Query("SELECT a.doctor.id as doctorId, COUNT(a.id) as bookingCount " +
           "FROM Appointment a " +
           "WHERE a.slotStartTime BETWEEN :start AND :end AND a.status != 'CANCELLED' " +
           "GROUP BY a.doctor.id " +
           "ORDER BY COUNT(a.id) DESC")
    List<Object[]> findBusiestDoctors(@Param("start") Instant start, @Param("end") Instant end);
}
