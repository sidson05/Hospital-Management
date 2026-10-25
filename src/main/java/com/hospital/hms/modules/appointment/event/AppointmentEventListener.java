package com.hospital.hms.modules.appointment.event;

import com.hospital.hms.modules.appointment.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class AppointmentEventListener {

    private final EmailService emailService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAppointmentBooked(AppointmentBookedEvent event) {
        log.info("Processing asynchronous booking confirmation for appointment: {}", event.getAppointmentId());
        emailService.sendBookingConfirmation(
                event.getPatientEmail(),
                event.getPatientName(),
                event.getDoctorName(),
                event.getDoctorSpecialization(),
                event.getSlotStartTime()
        );
    }
}
