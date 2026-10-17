package com.devflow.cloud;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.time.Times;
import com.devflow.global.webhook.WebhookTokenVerifier;
import com.devflow.member.entity.ProjectMember;
import com.devflow.member.type.ProjectRole;
import com.devflow.project.service.ProjectAccessChecker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * 프로젝트별 Webhook 토큰 WT1·WT2 (14.3).
 * 배포 기록(D3)·Alertmanager(I5)가 이 토큰을 보내면 토큰으로 프로젝트를 정한다.
 */
@Service
@RequiredArgsConstructor
public class WebhookTokenService {

    static final String PREFIX = "dfw_";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ProjectWebhookTokenRepository repository;
    private final ProjectAccessChecker access;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<CloudDtos.WebhookTokenSummary> list(Long userId, Long projectId) {
        requireOwner(userId, projectId);
        return repository.findByProjectIdOrderByTypeAsc(projectId).stream()
                .map(t -> new CloudDtos.WebhookTokenSummary(
                        t.getType().name().toLowerCase(Locale.ROOT),
                        Times.toOffset(t.getCreatedAt()),
                        Times.toOffset(t.getLastUsedAt())))
                .toList();
    }

    /** 발급·재발급. 원문은 이 응답에서 한 번만, 이전 토큰은 즉시 무효 */
    @Transactional
    public CloudDtos.WebhookTokenIssued issue(Long userId, Long projectId, String typeValue) {
        ProjectMember owner = requireOwner(userId, projectId);
        ProjectWebhookToken.Type type = parse(typeValue);
        String token = newToken();
        String hash = hash(token);
        LocalDateTime now = Times.now(clock);

        ProjectWebhookToken stored = repository.findByProjectIdAndType(projectId, type)
                .map(existing -> {
                    existing.rotate(hash, now);
                    return existing;
                })
                .orElseGet(() -> new ProjectWebhookToken(owner.getProject(), type, hash, now));
        repository.saveAndFlush(stored);
        return new CloudDtos.WebhookTokenIssued(type.name().toLowerCase(Locale.ROOT), token, Times.toOffset(now));
    }

    /** Authorization 헤더가 이 종류의 프로젝트 토큰이면 프로젝트 ID (사용 시각 기록) */
    @Transactional
    public Optional<Long> projectOf(ProjectWebhookToken.Type type, String authorizationHeader) {
        String token = WebhookTokenVerifier.bearer(authorizationHeader);
        if (token == null || !token.startsWith(PREFIX)) {
            return Optional.empty();
        }
        return repository.findByTokenHashAndType(hash(token), type)
                .map(stored -> {
                    stored.markUsed(Times.now(clock));
                    return stored.getProject().getId();
                });
    }

    /**
     * Webhook 호출자 확인. 프로젝트 토큰이면 그 프로젝트로 고정,
     * 아니면 서버 공용 토큰(운영자용)인지 확인. 둘 다 아니면 401.
     */
    @Transactional
    public Caller authenticate(ProjectWebhookToken.Type type, String authorizationHeader, String serverToken) {
        Optional<Long> project = projectOf(type, authorizationHeader);
        if (project.isPresent()) {
            return new Caller(project.get());
        }
        if (WebhookTokenVerifier.matches(serverToken, authorizationHeader)) {
            return new Caller(null);
        }
        throw new BusinessException(ErrorCode.INVALID_WEBHOOK_TOKEN);
    }

    /** projectId가 null이면 서버 공용 토큰 (본문·라벨로 프로젝트를 지정해야 함) */
    public record Caller(Long projectId) {

        public boolean projectToken() {
            return projectId != null;
        }
    }

    static ProjectWebhookToken.Type parse(String value) {
        try {
            return ProjectWebhookToken.Type.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "토큰 종류는 deployment 또는 alertmanager입니다.");
        }
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private ProjectMember requireOwner(Long userId, Long projectId) {
        ProjectMember membership = access.getMembership(projectId, userId);
        if (membership.getRole() != ProjectRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return membership;
    }
}
