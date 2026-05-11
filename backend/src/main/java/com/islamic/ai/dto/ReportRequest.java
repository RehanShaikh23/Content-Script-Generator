package com.islamic.ai.dto;

import lombok.Data;

@Data
public class ReportRequest {
    private String subject;
    private String description;
    private String screenshotUrl;
    private String deviceInfo;
}
