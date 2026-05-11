package com.islamic.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class IslamicAiBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(IslamicAiBackendApplication.class, args);
    }
}
