package com.islamic.ai.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method or class as requiring admin access.
 * The AdminAccessInterceptor checks for this annotation and validates
 * the JWT admin claim before allowing the request.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface AdminOnly {
}
