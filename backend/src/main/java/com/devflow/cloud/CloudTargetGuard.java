package com.devflow.cloud;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.ops.config.CloudProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;

/**
 * 사용자가 등록한 주소를 서버가 호출하기 전 확인 (SSRF 방지, Backend-API-구현-목록 14.4)
 * 항상 차단: 루프백, 링크 로컬·클라우드 메타데이터, 0.0.0.0, 멀티캐스트
 * 설정으로 허용: 사설망 (온프렘 시연)
 * 저장할 때와 호출할 때마다 DNS 결과를 다시 확인한다.
 */
@Component
@RequiredArgsConstructor
public class CloudTargetGuard {

    private final CloudProperties properties;

    /** 형식·주소 확인 후 정규화한 URL(끝 / 제거) */
    public String check(String url) {
        URI uri;
        try {
            uri = URI.create(url.trim());
        } catch (IllegalArgumentException e) {
            throw invalid("주소 형식이 올바르지 않습니다.");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw invalid("http 또는 https 주소만 연결할 수 있습니다.");
        }
        if (uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) {
            throw invalid("주소에는 호스트만 포함해야 합니다 (사용자 정보·쿼리 불가).");
        }
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(uri.getHost());
        } catch (UnknownHostException e) {
            throw invalid("호스트 이름을 찾을 수 없습니다: " + uri.getHost());
        }
        for (InetAddress address : addresses) {
            String reason = blockedReason(address, properties.allowPrivateNetwork());
            if (reason != null) {
                throw invalid(reason);
            }
        }
        return url.trim().replaceAll("/+$", "");
    }

    /** 차단 사유 (허용이면 null) */
    static String blockedReason(InetAddress address, boolean allowPrivate) {
        if (address.isLoopbackAddress() || address.isAnyLocalAddress()) {
            return "자기 자신(루프백) 주소는 연결할 수 없습니다.";
        }
        if (address.isLinkLocalAddress() || isMetadata(address)) {
            return "링크 로컬·클라우드 메타데이터 주소는 연결할 수 없습니다.";
        }
        if (address.isMulticastAddress()) {
            return "멀티캐스트 주소는 연결할 수 없습니다.";
        }
        boolean privateNetwork = address.isSiteLocalAddress() || isUniqueLocalV6(address);
        if (privateNetwork && !allowPrivate) {
            return "사설망 주소는 연결할 수 없습니다.";
        }
        return null;
    }

    private static boolean isMetadata(InetAddress address) {
        byte[] b = address.getAddress();
        // fd00:ec2::254 (AWS IPv6 메타데이터)
        return address instanceof Inet6Address && b.length == 16
                && (b[0] & 0xff) == 0xfd && b[1] == 0 && (b[2] & 0xff) == 0x0e && (b[3] & 0xff) == 0xc2
                && (b[15] & 0xff) == 0x54 && (b[14] & 0xff) == 0x02;
    }

    private static boolean isUniqueLocalV6(InetAddress address) {
        return address instanceof Inet6Address && (address.getAddress()[0] & 0xfe) == 0xfc;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ErrorCode.INVALID_CLOUD_TARGET, message);
    }
}
