import com.polyta.mobile.RoutePolicy;

public class RoutePolicyTest {
    private static void expect(boolean expected, boolean value, String input) {
        if (expected != value) throw new AssertionError(input);
    }
    public static void main(String[] args) {
        for (String path : new String[]{"/", "/pages/admin/", "/apps/spk-automation/", "/unduh/", "/apps/spk-automation/print-spk/?spk=A24.004"})
            expect(true, RoutePolicy.internal(RoutePolicy.ORIGIN + path), path);
        expect(true, RoutePolicy.internal("https://polytaglobalmandiri.github.io:443/"), "default TLS port");
        for (String url : new String[]{"http://polytaglobalmandiri.github.io/", "https://polytaglobalmandiri.github.io.evil.test/",
                "https://polytaglobalmandiri.github.io@evil.test/", "https://evil.test@polytaglobalmandiri.github.io/",
                "https://polytaglobalmandiri.github.io:444/", "file:///etc/passwd", "content://private/data",
                "javascript:alert(1)", "intent://open", "data:text/html,test", "//polytaglobalmandiri.github.io/", "not a url", "", null})
            expect(false, RoutePolicy.internal(url), url);
        for (String url : new String[]{"https://docs.google.com/", "mailto:test@example.invalid", "tel:123"})
            expect(true, RoutePolicy.external(url), url);
        for (String url : new String[]{"http://example.org", "javascript:alert(1)", "file:///tmp/file", "content://private", "intent://test", "data:text/html,test", null})
            expect(false, RoutePolicy.external(url), url);
        System.out.println("PASS: portal navigation, external schemes, spoofed hosts, credentials, ports, malformed and local URLs");
    }
}
