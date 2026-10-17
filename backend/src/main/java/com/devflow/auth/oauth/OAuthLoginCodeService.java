package com.devflow.auth.oauth;

import com.devflow.auth.dto.LoginResponse;
import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.jwt.JwtTokenProvider;
import com.devflow.global.time.Times;
import com.devflow.user.entity.User;
import com.devflow.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

/** 1회용 code 발급(성공 핸들러)과 교환(X3) */
@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthLoginCodeService {

    static final Duration TTL = Duration.ofSeconds(60);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OAuthLoginCodeRepository repository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final Clock clock;

    @Transactional
    public String issue(Long userId) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        LocalDateTime now = Times.now(clock);
        repository.save(new OAuthLoginCode(hash(code), userId, now, now.plus(TTL)));
        return code;
    }

    /** X3: 만료·재사용·없는 code → 400 INVALID_OAUTH_CODE */
    @Transactional
    public LoginResponse exchange(String code) {
        String hash = hash(code == null ? "" : code.trim());
        OAuthLoginCode stored = repository.findById(hash)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_OAUTH_CODE));
        if (repository.consume(hash, Times.now(clock)) != 1) {
            throw new BusinessException(ErrorCode.INVALID_OAUTH_CODE);
        }
        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_OAUTH_CODE));
        return LoginResponse.of(jwtTokenProvider.createToken(user.getId(), user.getEmail()));
    }

    @Scheduled(fixedDelay = 600_000, initialDelay = 600_000)
    public void cleanUp() {
        int deleted = repository.deleteExpired(Times.now(clock));
        if (deleted > 0) {
            log.debug("expired oauth login codes deleted: {}", deleted);
        }
    }

    static String hash(String code) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(code.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
