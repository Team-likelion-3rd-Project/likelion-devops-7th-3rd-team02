package com.devflow.ops.service;

import com.devflow.global.time.Times;
import com.devflow.ops.config.CloudEnvironment;
import com.devflow.ops.dto.OpsDtos;
import com.devflow.ops.prometheus.PromSample;
import com.devflow.ops.prometheus.PrometheusClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Kubernetes 상태 (K1, K2, E2, E3)를 kube-state-metrics·node-exporter 지표로 읽는다.
 * 여러 지표를 __name__ 정규식으로 한 번에 조회해 호출 수를 줄인다. 10초 캐시.
 */
@Service
@RequiredArgsConstructor
public class KubeStatusService {

    static final Duration TTL = Duration.ofSeconds(10);

    private final PrometheusClient prometheus;
    private final Clock clock;

    // ---------- K1 ----------
    public OpsDtos.K8sDeploymentList deployments(CloudEnvironment env) {
        List<PromSample> samples = prometheus.query(env,
                "{__name__=~\"kube_deployment_spec_replicas|kube_deployment_status_replicas_available"
                        + "|kube_deployment_status_replicas_ready|kube_deployment_status_replicas_updated\","
                        + "namespace=\"" + env.namespace() + "\"}", TTL);

        Map<String, int[]> byName = new TreeMap<>();
        for (PromSample s : samples) {
            String name = s.label("deployment");
            if (name == null) {
                continue;
            }
            int[] v = byName.computeIfAbsent(name, k -> new int[4]);
            int value = (int) Math.round(s.valueOr(0));
            switch (s.name()) {
                case "kube_deployment_spec_replicas" -> v[0] = value;
                case "kube_deployment_status_replicas_available" -> v[1] = value;
                case "kube_deployment_status_replicas_ready" -> v[2] = value;
                case "kube_deployment_status_replicas_updated" -> v[3] = value;
                default -> {
                }
            }
        }

        List<OpsDtos.K8sDeployment> deployments = byName.entrySet().stream()
                .map(e -> new OpsDtos.K8sDeployment(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2], e.getValue()[3]))
                .toList();
        return new OpsDtos.K8sDeploymentList(deployments, now());
    }

    /** Deployment 하나의 준비·목표 레플리카. 지표에 없으면 empty */
    public Optional<OpsDtos.Replicas> replicas(CloudEnvironment env, String deployment) {
        return deployments(env).deployments().stream()
                .filter(d -> d.name().equals(deployment))
                .findFirst()
                .map(d -> new OpsDtos.Replicas(d.readyReplicas(), d.desiredReplicas()));
    }

    public Optional<OpsDtos.Replicas> backendReplicas(CloudEnvironment env) {
        if (env.appDeployment() == null) {
            return Optional.empty();
        }
        return replicas(env, env.appDeployment());
    }

    // ---------- K2 ----------
    public OpsDtos.K8sPodList pods(CloudEnvironment env) {
        List<PromSample> samples = prometheus.query(env,
                "{__name__=~\"kube_pod_status_phase|kube_pod_container_status_restarts_total|kube_pod_container_info"
                        + "|kube_pod_created|kube_pod_container_status_ready|kube_pod_container_status_waiting_reason\","
                        + "namespace=\"" + env.namespace() + "\"}", TTL);

        Map<String, PodBuilder> pods = new TreeMap<>();
        for (PromSample s : samples) {
            String podName = s.label("pod");
            if (podName == null) {
                continue;
            }
            PodBuilder pod = pods.computeIfAbsent(podName, PodBuilder::new);
            double value = s.valueOr(0);
            switch (s.name()) {
                case "kube_pod_status_phase" -> {
                    if (value >= 1) {
                        pod.phase = s.label("phase");
                    }
                }
                case "kube_pod_container_status_restarts_total" -> pod.restarts += (int) Math.round(value);
                case "kube_pod_container_info" -> {
                    pod.containers.add(s.label("container"));
                    if (pod.image == null) {
                        pod.image = shortImage(s.label("image"));
                    }
                }
                case "kube_pod_created" -> pod.createdEpoch = (long) value;
                case "kube_pod_container_status_ready" -> {
                    if (value >= 1) {
                        pod.ready++;
                    }
                }
                case "kube_pod_container_status_waiting_reason" -> {
                    if (value >= 1) {
                        pod.waitingReason = s.label("reason");
                    }
                }
                default -> {
                }
            }
        }

        List<OpsDtos.K8sPod> result = pods.values().stream().map(PodBuilder::build).toList();
        return new OpsDtos.K8sPodList(result, now());
    }

    /** 레지스트리 경로·digest를 뺀 이름:태그 (예: ghcr.io/team/backend:7f3c2a1 → backend:7f3c2a1) */
    static String shortImage(String image) {
        if (image == null || image.isBlank()) {
            return null;
        }
        String withoutDigest = image.split("@", 2)[0];
        int slash = withoutDigest.lastIndexOf('/');
        return slash >= 0 ? withoutDigest.substring(slash + 1) : withoutDigest;
    }

    private static final class PodBuilder {
        private final String name;
        private final TreeSet<String> containers = new TreeSet<>();
        private String phase = "Unknown";
        private String waitingReason;
        private String image;
        private int restarts;
        private int ready;
        private long createdEpoch;

        private PodBuilder(String name) {
            this.name = name;
        }

        private OpsDtos.K8sPod build() {
            // CrashLoopBackOff 등으로 대기 중이면 그 사유를 상태로 보여 준다
            String status = waitingReason != null ? waitingReason : phase;
            OffsetDateTime created = createdEpoch > 0
                    ? Instant.ofEpochSecond(createdEpoch).atZone(Times.SEOUL).toOffsetDateTime()
                    : null;
            return new OpsDtos.K8sPod(name, status, ready, Math.max(containers.size(), ready), restarts, created, image);
        }
    }

    // ---------- E2 ----------
    public OpsDtos.NodeList nodes(CloudEnvironment env) {
        List<PromSample> info = prometheus.query(env,
                "{__name__=~\"kube_node_info|kube_node_created|kube_node_role|kube_node_status_condition\"}", TTL);

        Map<String, NodeBuilder> nodes = new TreeMap<>();
        for (PromSample s : info) {
            String nodeName = s.label("node");
            if (nodeName == null) {
                continue;
            }
            NodeBuilder node = nodes.computeIfAbsent(nodeName, NodeBuilder::new);
            switch (s.name()) {
                case "kube_node_info" -> node.kubeletVersion = s.label("kubelet_version");
                case "kube_node_created" -> node.createdEpoch = (long) s.valueOr(0);
                case "kube_node_role" -> {
                    if (s.label("role") != null) {
                        node.roles.add(s.label("role"));
                    }
                }
                case "kube_node_status_condition" -> {
                    if ("Ready".equals(s.label("condition")) && "true".equals(s.label("status")) && s.valueOr(0) >= 1) {
                        node.ready = true;
                    }
                }
                default -> {
                }
            }
        }

        String label = env.nodeLabel();
        Map<String, Double> cpu = byLabel(prometheus.query(env,
                "100 - avg by (" + label + ")(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100", TTL), label);
        Map<String, Double> memory = byLabel(prometheus.query(env,
                "100 * (1 - sum by (" + label + ")(node_memory_MemAvailable_bytes) / sum by (" + label + ")(node_memory_MemTotal_bytes))",
                TTL), label);

        List<OpsDtos.Node> result = new ArrayList<>();
        for (NodeBuilder node : nodes.values()) {
            List<String> roles = node.roles.isEmpty() ? List.of("worker") : List.copyOf(node.roles);
            result.add(new OpsDtos.Node(
                    node.name,
                    roles,
                    node.ready,
                    round1(cpu.get(node.name)),
                    round1(memory.get(node.name)),
                    node.kubeletVersion,
                    node.createdEpoch > 0 ? Instant.ofEpochSecond(node.createdEpoch).atZone(Times.SEOUL).toOffsetDateTime() : null
            ));
        }
        return new OpsDtos.NodeList(result, now());
    }

    private static final class NodeBuilder {
        private final String name;
        private final TreeSet<String> roles = new TreeSet<>();
        private boolean ready;
        private String kubeletVersion;
        private long createdEpoch;

        private NodeBuilder(String name) {
            this.name = name;
        }
    }

    // ---------- E3 ----------
    public OpsDtos.HpaList hpas(CloudEnvironment env) {
        List<PromSample> samples = prometheus.query(env,
                "{__name__=~\"kube_horizontalpodautoscaler_info|kube_horizontalpodautoscaler_status_current_replicas"
                        + "|kube_horizontalpodautoscaler_status_desired_replicas|kube_horizontalpodautoscaler_spec_min_replicas"
                        + "|kube_horizontalpodautoscaler_spec_max_replicas|kube_horizontalpodautoscaler_spec_target_metric"
                        + "|kube_horizontalpodautoscaler_status_target_metric\","
                        + "namespace=\"" + env.namespace() + "\"}", TTL);

        Map<String, Map<String, Object>> byName = new LinkedHashMap<>();
        for (PromSample s : samples) {
            String name = s.label("horizontalpodautoscaler");
            if (name == null) {
                continue;
            }
            Map<String, Object> hpa = byName.computeIfAbsent(name, k -> new LinkedHashMap<>());
            Integer value = s.value() == null ? null : (int) Math.round(s.value());
            boolean cpuUtilization = "cpu".equals(s.label("metric_name"))
                    && "utilization".equalsIgnoreCase(String.valueOf(s.label("metric_target_type")));
            switch (s.name()) {
                case "kube_horizontalpodautoscaler_info" -> hpa.put("target", s.label("scaletargetref_name"));
                case "kube_horizontalpodautoscaler_status_current_replicas" -> hpa.put("current", value);
                case "kube_horizontalpodautoscaler_status_desired_replicas" -> hpa.put("desired", value);
                case "kube_horizontalpodautoscaler_spec_min_replicas" -> hpa.put("min", value);
                case "kube_horizontalpodautoscaler_spec_max_replicas" -> hpa.put("max", value);
                case "kube_horizontalpodautoscaler_spec_target_metric" -> {
                    if (cpuUtilization) {
                        hpa.put("targetCpu", value);
                    }
                }
                case "kube_horizontalpodautoscaler_status_target_metric" -> {
                    if (cpuUtilization) {
                        hpa.put("currentCpu", value);
                    }
                }
                default -> {
                }
            }
        }

        List<OpsDtos.Hpa> hpas = byName.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.naturalOrder()))
                .map(e -> new OpsDtos.Hpa(
                        e.getKey(),
                        (String) e.getValue().get("target"),
                        (Integer) e.getValue().get("current"),
                        (Integer) e.getValue().get("desired"),
                        (Integer) e.getValue().get("min"),
                        (Integer) e.getValue().get("max"),
                        (Integer) e.getValue().get("currentCpu"),
                        (Integer) e.getValue().get("targetCpu")))
                .toList();
        return new OpsDtos.HpaList(hpas, now());
    }

    private static Map<String, Double> byLabel(List<PromSample> samples, String label) {
        Map<String, Double> map = new LinkedHashMap<>();
        for (PromSample s : samples) {
            if (s.label(label) != null) {
                map.put(s.label(label), s.value());
            }
        }
        return map;
    }

    static Double round1(Double value) {
        return value == null ? null : Math.round(value * 10) / 10.0;
    }

    private OffsetDateTime now() {
        return Times.nowOffset(clock);
    }
}
