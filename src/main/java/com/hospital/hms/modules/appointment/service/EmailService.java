package com.hospital.hms.modules.appointment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendBookingConfirmation(
            String toEmail,
            String patientName,
            String doctorName,
            String specialization,
            Instant slotStartTime) {

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("noreply@hospital.com");
            message.setTo(toEmail);
            message.setSubject("Appointment Confirmation - Hospital Management System");
            message.setText(String.format(
                    "Dear %s,\n\n" +
                    "Your appointment has been successfully scheduled.\n\n" +
                    "Doctor: Dr. %s (%s)\n" +
                    "Scheduled Time: %s (UTC)\n\n" +
                    "If you need to reschedule or cancel your visit, please log into your patient portal.\n\n" +
                    "Warm regards,\n" +
                    "Hospital Outpatient Department",
                    patientName, doctorName, specialization, slotStartTime
            ));

            mailSender.send(message);
            log.info("Booking confirmation email successfully dispatched to: {}", toEmail);
        } catch (Exception ex) {
            log.warn("Could not dispatch confirmation email to {} (mail server might be offline): {}", toEmail, ex.getMessage());
        }
    }
}
