package com.islamic.ai.security;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitConfig {

    private Tier login = new Tier(3, 15);
    private Tier signup = new Tier(3, 60);
    private Tier generate = new Tier(10, 60);
    private Tier general = new Tier(60, 1);

    @Data
    public static class Tier {
        private int capacity;
        private int minutes;

        public Tier() {}

        public Tier(int capacity, int minutes) {
            this.capacity = capacity;
            this.minutes = minutes;
        }
    }
}
