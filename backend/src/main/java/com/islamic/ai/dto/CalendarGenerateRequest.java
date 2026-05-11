package com.islamic.ai.dto;

import lombok.Data;

@Data
public class CalendarGenerateRequest {
    private int duration;     // 7, 14, or 30
    private String category;  // quran, hadith, prophets, etc. or "auto_mix"
    private String tone;      // educational, inspirational, storytelling
    private String platform;  // shorts, reels
    private String timezone;  // e.g. "Asia/Kolkata", "America/New_York"
}
