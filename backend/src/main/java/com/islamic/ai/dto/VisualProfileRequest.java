package com.islamic.ai.dto;

import lombok.Data;

@Data
public class VisualProfileRequest {
    private String topic;
    private String category;
    private String videoFormat;
    private String visualStyle;     // e.g. "cinematic_documentary", "historical_documentary"
}
