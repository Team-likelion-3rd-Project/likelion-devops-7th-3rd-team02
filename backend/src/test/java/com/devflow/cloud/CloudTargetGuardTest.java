package com.devflow.cloud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.ops.config.CloudProperties;
import java.net.InetAddress;
import org.junit.jupiter.api.Test;

class CloudTargetGuardTest {

    private static InetAddress ip(String literal) throws Exception {
        return InetAddress.getByName(literal);
    }

    @Test
    void 루프백_링크로컬_메타데이터_멀티캐스트는_항상_차단() throws Exception {
        for (String blocked : new String[]{"127.0.0.1", "::1", "0.0.0.0", "169.254.169.254", "fe80::1",
                "fd00:ec2::254", "224.0.0.1"}) {
            assertThat(CloudTargetGuard.blockedReason(ip(blocked), true)).as(blocked).isNotNull();
        }
    }

    @Test
    void 사설망은_설정에_따라_허용() throws Exception {
        for (String privateIp : new String[]{"10.0.0.5", "172.18.0.3", "192.168.0.10", "fd12:3456::1"}) {
            assertThat(CloudTargetGuard.blockedReason(ip(privateIp), true)).as(privateIp).isNull();
            assertThat(CloudTargetGuard.blockedReason(ip(privateIp), false)).as(privateIp).isNotNull();
        }
        assertThat(CloudTargetGuard.blockedReason(ip("8.8.8.8"), false)).isNull();
    }

    @Test
    void 주소는_http_https_호스트만_허용하고_끝_슬래시를_뗀다() {
        CloudTargetGuard guard = new CloudTargetGuard(new CloudProperties(true, null, null));

        assertThat(guard.check(" http://10.0.0.5:9090/ ")).isEqualTo("http://10.0.0.5:9090");
        assertThat(guard.check("https://8.8.8.8/prometheus//")).isEqualTo("https://8.8.8.8/prometheus");
        for (String bad : new String[]{"file:///etc/passwd", "ftp://10.0.0.5", "http://user:pw@10.0.0.5",
                "http://10.0.0.5:9090?x=1", "http://127.0.0.1:9090", "http://169.254.169.254/latest"}) {
            assertThatThrownBy(() -> guard.check(bad)).as(bad)
                    .isInstanceOfSatisfying(BusinessException.class,
                            e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INVALID_CLOUD_TARGET));
        }
    }
}
