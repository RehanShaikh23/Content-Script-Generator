package com.islamic.ai.dto;

import lombok.Data;

@Data
public class GenerateRequest {
    private String topic;
    private String extra;
    private String videoFormat;
    private String category;
    private String tone;
    private String customTone; // Used when tone is "custom" — premium feature
    private String language;   // Output language — premium feature (e.g. "arabic", "urdu", "hindi")
}
