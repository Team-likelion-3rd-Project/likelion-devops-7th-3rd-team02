package com.devflow.global.external;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.function.Supplier;

/** 외부 호출 공통: 짧은 타임아웃 + 실패를 502/504로 바꿔 다른 API에 영향이 없게 한다 */
public final class ExternalHttp {

    public static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(2);
    public static final Duration READ_TIMEOUT = Duration.ofSeconds(5);

    private ExternalHttp() {
    }

    public static RestClient.Builder restClient() {
        return restClient(true);
    }

    /** 사용자가 등록한 주소를 호출할 때는 리다이렉트를 따라가지 않는다 (SSRF 우회 방지) */
    public static RestClient.Builder restClient(boolean followRedirects) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(followRedirects ? HttpClient.Redirect.NORMAL : HttpClient.Redirect.NEVER)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder().requestFactory(factory);
    }

    /** system: 사용자에게 보여 줄 시스템 이름 (예: "Prometheus", "GitHub") */
    public static <T> T call(String system, Supplier<T> call) {
        try {
            return call.get();
        } catch (RestClientResponseException e) {
            throw ExternalApiException.error(system + " 응답 오류(" + e.getStatusCode().value() + ")로 정보를 가져오지 못했습니다.");
        } catch (ResourceAccessException e) {
            if (hasCause(e, HttpTimeoutException.class)) {
                throw ExternalApiException.timeout(system + " 응답이 늦어 정보를 가져오지 못했습니다.");
            }
            throw ExternalApiException.error(system + "에 연결할 수 없습니다.");
        } catch (RestClientException e) {
            throw ExternalApiException.error(system + "에서 정보를 가져오지 못했습니다.");
        }
    }

    private static boolean hasCause(Throwable error, Class<? extends Throwable> type) {
        for (Throwable t = error; t != null; t = t.getCause()) {
            if (type.isInstance(t)) {
                return true;
            }
        }
        return false;
    }
}
