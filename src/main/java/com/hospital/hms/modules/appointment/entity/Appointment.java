package com.hospital.hms.modules.appointment.entity;

import com.hospital.hms.common.entity.BaseEntity;
import com.hospital.hms.modules.doctor.entity.Doctor;
import com.hospital.hms.modules.patient.entity.Patient;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "appointments", indexes = {
        @Index(name = "idx_appointments_doctor", columnList = "doctor_id, slot_start_time"),
        @Index(name = "idx_appointments_patient", columnList = "patient_id, slot_start_time"),
        @Index(name = "idx_appointments_status", columnList = "status")
})
public class Appointment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "slot_start_time", nullable = false)
    private Instant slotStartTime;

    @Column(name = "slot_end_time", nullable = false)
    private Instant slotEndTime;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AppointmentStatus status = AppointmentStatus.BOOKED;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "active_booking_token", unique = true)
    private String activeBookingToken;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
