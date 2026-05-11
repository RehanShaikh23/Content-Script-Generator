package com.islamic.ai.dto;

import lombok.Data;
import java.util.List;

@Data
public class CalendarDayUpdateRequest {
    private int dayNumber;
    private String topic;
    private String script;
    private String caption;
    private List<String> hashtags;
    private String postingTime;
    private Boolean isPosted;
}
