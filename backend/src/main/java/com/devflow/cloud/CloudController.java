package com.devflow.cloud;

import com.devflow.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 프로젝트 클라우드 연결 CL1~CL5, Webhook 토큰 WT1·WT2 (Backend-API-구현-목록 14장) */
@RestController
@RequestMapping("/api/projects/{projectId}")
@RequiredArgsConstructor
public class CloudController {

    private final ProjectCloudService cloud;
    private final WebhookTokenService tokens;

    @GetMapping("/cloud/environments")
    public ResponseEntity<ApiResponse<List<CloudDtos.EnvironmentResponse>>> list(
            Authentication authentication, @PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.success("클라우드 환경 목록 조회에 성공했습니다.",
                cloud.list(userId(authentication), projectId)));
    }

    @PostMapping("/cloud/environments")
    public ResponseEntity<ApiResponse<CloudDtos.EnvironmentResponse>> create(
            Authentication authentication, @PathVariable Long projectId,
            @Valid @RequestBody CloudDtos.EnvironmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("클라우드 환경을 연결했습니다.",
                cloud.create(userId(authentication), projectId, request)));
    }

    @PutMapping("/cloud/environments/{environmentId}")
    public ResponseEntity<ApiResponse<CloudDtos.EnvironmentResponse>> update(
            Authentication authentication, @PathVariable Long projectId, @PathVariable Long environmentId,
            @Valid @RequestBody CloudDtos.EnvironmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("클라우드 환경을 수정했습니다.",
                cloud.update(userId(authentication), projectId, environmentId, request)));
    }

    @DeleteMapping("/cloud/environments/{environmentId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            Authentication authentication, @PathVariable Long projectId, @PathVariable Long environmentId) {
        cloud.delete(userId(authentication), projectId, environmentId);
        return ResponseEntity.ok(ApiResponse.success("클라우드 환경을 삭제했습니다.", null));
    }

    @PostMapping("/cloud/environments/{environmentId}/test")
    public ResponseEntity<ApiResponse<CloudDtos.TestResponse>> test(
            Authentication authentication, @PathVariable Long projectId, @PathVariable Long environmentId) {
        return ResponseEntity.ok(ApiResponse.success("연결 확인을 마쳤습니다.",
                cloud.test(userId(authentication), projectId, environmentId)));
    }

    @GetMapping("/webhook-tokens")
    public ResponseEntity<ApiResponse<List<CloudDtos.WebhookTokenSummary>>> tokens(
            Authentication authentication, @PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.success("Webhook 토큰 목록 조회에 성공했습니다.",
                tokens.list(userId(authentication), projectId)));
    }

    @PostMapping("/webhook-tokens/{type}")
    public ResponseEntity<ApiResponse<CloudDtos.WebhookTokenIssued>> issue(
            Authentication authentication, @PathVariable Long projectId, @PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.success("Webhook 토큰을 발급했습니다. 이 화면을 벗어나면 다시 볼 수 없습니다.",
                tokens.issue(userId(authentication), projectId, type)));
    }

    private static Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
