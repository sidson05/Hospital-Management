package com.hospital.hms.security;

public enum Role {
    ROLE_PATIENT,
    ROLE_DOCTOR,
    ROLE_ADMIN;

    public String getCleanRoleName() {
        return this.name().replace("ROLE_", "");
    }
}
