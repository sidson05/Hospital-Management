package com.hospital.hms.common.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards SPA routes to index.html for client-side routing
 */
@Controller
public class SpaController {

    @GetMapping(value = {"/login", "/book", "/appointments", "/reports"})
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
