package com.devflow.ops.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devflow.ops.config.CloudEnvironment;
import com.devflow.ops.dto.OpsDtos;
import com.devflow.ops.prometheus.PromSample;
import com.devflow.ops.prometheus.PrometheusClient;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class KubeStatusPodsTest {

    private static PromSample sample(String name, String pod, double value, String... labels) {
        Map<String, String> map = new java.util.HashMap<>(Map.of("__name__", name, "pod", pod));
        for (int i = 0; i + 1 < labels.length; i += 2) {
            map.put(labels[i], labels[i + 1]);
        }
        return new PromSample(map, value);
    }

    @Test
    void 삭제_시각이_있는_Pod는_Terminating으로_표시한다() {
        PrometheusClient prometheus = mock(PrometheusClient.class);
        when(prometheus.query(any(), anyString(), any(Duration.class))).thenReturn(List.of(
                sample("kube_pod_status_phase", "redis-1", 1, "phase", "Running"),
                sample("kube_pod_deletion_timestamp", "redis-1", 1761530000),
                sample("kube_pod_status_phase", "backend-1", 1, "phase", "Running"),
                sample("kube_pod_status_phase", "worker-1", 1, "phase", "Running"),
                sample("kube_pod_container_status_waiting_reason", "worker-1", 1, "reason", "CrashLoopBackOff")));
        KubeStatusService service = new KubeStatusService(prometheus, Clock.systemUTC());
        CloudEnvironment env = new CloudEnvironment("env-1", 1L, "dev", "dev", "http://prom", null,
                "devflow", "backend", "backend", "node", null);

        Map<String, String> status = new java.util.HashMap<>();
        for (OpsDtos.K8sPod pod : service.pods(env).pods()) {
            status.put(pod.name(), pod.status());
        }

        assertThat(status).containsEntry("redis-1", "Terminating")
                .containsEntry("backend-1", "Running")
                .containsEntry("worker-1", "CrashLoopBackOff");
    }
}
