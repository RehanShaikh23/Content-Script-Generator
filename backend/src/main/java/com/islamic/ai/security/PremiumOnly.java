package com.islamic.ai.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method as requiring an active Premium subscription.
 * The {@link PremiumAccessInterceptor} checks for this annotation and
 * returns 403 if the authenticated user is not on the premium tier.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface PremiumOnly {
}
