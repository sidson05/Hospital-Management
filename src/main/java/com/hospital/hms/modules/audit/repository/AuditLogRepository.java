package com.hospital.hms.modules.audit.repository;

import com.hospital.hms.modules.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findAllByEntityIdOrderByCreatedAtDesc(UUID entityId);

    List<AuditLog> findAllByEntityNameOrderByCreatedAtDesc(String entityName);
}
