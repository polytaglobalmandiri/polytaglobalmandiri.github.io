package com.polyta.mobile;

import java.net.URI;

/** Kept independent of Android so navigation boundaries can be tested on the JVM. */
public final class RoutePolicy {
    public static final String ORIGIN = "https://polytaglobalmandiri.github.io";
    private RoutePolicy() {}
    public static boolean internal(String url) {
        try {
            URI uri = new URI(url);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && "polytaglobalmandiri.github.io".equalsIgnoreCase(uri.getHost())
                    && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (Exception invalid) { return false; }
    }
    public static boolean external(String url) {
        try {
            String scheme = new URI(url).getScheme();
            return "https".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme)
                    || "tel".equalsIgnoreCase(scheme);
        } catch (Exception invalid) { return false; }
    }
}
