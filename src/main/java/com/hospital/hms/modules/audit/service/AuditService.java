package com.hospital.hms.modules.audit.service;

import com.hospital.hms.modules.audit.entity.AuditLog;
import com.hospital.hms.modules.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(String entityName, UUID entityId, String action, String performedBy, String details) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .entityName(entityName)
                    .entityId(entityId)
                    .action(action)
                    .performedBy(performedBy)
                    .details(details)
                    .createdAt(Instant.now())
                    .build();
            auditLogRepository.save(auditLog);
            log.info("Audit logged: {} on {} (ID: {}) by {}", action, entityName, entityId, performedBy);
        } catch (Exception ex) {
            log.error("Failed to persist audit log for entity {}: {}", entityName, ex.getMessage());
        }
    }
}
