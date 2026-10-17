package com.devflow.ops.controller;

import com.devflow.global.response.ApiResponse;
import com.devflow.ops.cloud.CloudStatusService;
import com.devflow.ops.config.Environments;
import com.devflow.ops.dto.OpsDtos;
import com.devflow.ops.service.EnvironmentService;
import com.devflow.ops.service.KubeStatusService;
import com.devflow.ops.service.MonitoringService;
import com.devflow.project.service.ProjectAccessChecker;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 운영 상태 API (Backend-API-구현-목록 K1, K2, O1, E1~E5)
 * env: E1 목록의 name (생략 시 Backend가 떠 있는 환경, 없는 값 404 ENVIRONMENT_NOT_FOUND)
 * 외부 조회 실패: 502 EXTERNAL_API_ERROR / 504 EXTERNAL_API_TIMEOUT (E1은 항상 200)
 */
@RestController
@RequestMapping("/api/projects/{projectId}")
@RequiredArgsConstructor
public class OpsController {

    private final ProjectAccessChecker projectAccessChecker;
    private final Environments environments;
    private final KubeStatusService kubeStatus;
    private final MonitoringService monitoring;
    private final EnvironmentService environmentService;
    private final CloudStatusService cloudStatus;

    @GetMapping("/environments")
    public ResponseEntity<ApiResponse<List<OpsDtos.EnvironmentSummary>>> environments(
            Authentication authentication, @PathVariable Long projectId) {
        check(authentication, projectId);
        return ok("환경 목록 조회에 성공했습니다.", environmentService.summaries(projectId));
    }

    @GetMapping("/k8s/deployments")
    public ResponseEntity<ApiResponse<OpsDtos.K8sDeploymentList>> deployments(
            Authentication authentication, @PathVariable Long projectId, @RequestParam(required = false) String env) {
        check(authentication, projectId);
        return ok("Deployment 상태 조회에 성공했습니다.", kubeStatus.deployments(environments.resolve(env)));
    }

    @GetMapping("/k8s/pods")
    public ResponseEntity<ApiResponse<OpsDtos.K8sPodList>> pods(
            Authentication authentication, @PathVariable Long projectId, @RequestParam(required = false) String env) {
        check(authentication, projectId);
        return ok("Pod 목록 조회에 성공했습니다.", kubeStatus.pods(environments.resolve(env)));
    }

    @GetMapping("/k8s/nodes")
    public ResponseEntity<ApiResponse<OpsDtos.NodeList>> nodes(
            Authentication authentication, @PathVariable Long projectId, @RequestParam(required = false) String env) {
        check(authentication, projectId);
        return ok("노드 상태 조회에 성공했습니다.", kubeStatus.nodes(environments.resolve(env)));
    }

    @GetMapping("/k8s/hpa")
    public ResponseEntity<ApiResponse<OpsDtos.HpaList>> hpas(
            Authentication authentication, @PathVariable Long projectId, @RequestParam(required = false) String env) {
        check(authentication, projectId);
        return ok("HPA 상태 조회에 성공했습니다.", kubeStatus.hpas(environments.resolve(env)));
    }

    @GetMapping("/monitoring/summary")
    public ResponseEntity<ApiResponse<OpsDtos.MonitoringSummary>> monitoringSummary(
            Authentication authentication,
            @PathVariable Long projectId,
            @RequestParam(required = false) String range,
            @RequestParam(required = false) String env
    ) {
        check(authentication, projectId);
        return ok("모니터링 요약 조회에 성공했습니다.", monitoring.summary(environments.resolve(env), range));
    }

    /** E4: DB 상태 (AWS 환경은 RDS, 온프렘은 postgres_exporter) */
    @GetMapping("/cloud/database")
    public ResponseEntity<ApiResponse<OpsDtos.DatabaseStatus>> database(
            Authentication authentication, @PathVariable Long projectId, @RequestParam(required = false) String env) {
        check(authentication, projectId);
        return ok("DB 상태 조회에 성공했습니다.", cloudStatus.database(environments.resolve(env)));
    }

    /** E5: 로드밸런서 상태 (AWS 환경은 ALB, 온프렘은 Traefik) */
    @GetMapping("/cloud/load-balancer")
    public ResponseEntity<ApiResponse<OpsDtos.LoadBalancerStatus>> loadBalancer(
            Authentication authentication, @PathVariable Long projectId, @RequestParam(required = false) String env) {
        check(authentication, projectId);
        return ok("로드밸런서 상태 조회에 성공했습니다.", cloudStatus.loadBalancer(environments.resolve(env)));
    }

    private void check(Authentication authentication, Long projectId) {
        projectAccessChecker.checkMember(projectId, (Long) authentication.getPrincipal());
    }

    private static <T> ResponseEntity<ApiResponse<T>> ok(String message, T data) {
        return ResponseEntity.ok(ApiResponse.success(message, data));
    }
}
