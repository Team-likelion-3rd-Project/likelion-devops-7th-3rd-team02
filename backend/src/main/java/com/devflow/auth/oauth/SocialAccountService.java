package com.devflow.auth.oauth;

import com.devflow.user.entity.User;
import com.devflow.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;

/**
 * 소셜 계정 → DevFlow 사용자 (확정 2026-10-14)
 * 1) 이미 연결된 계정이면 그 사용자
 * 2) 인증된 이메일이 없으면 email_not_available
 * 3) 같은 이메일 사용자가 있으면 자동 연결. 단, 그 사용자에게 같은 제공자의 다른 계정이 이미 있으면 account_conflict
 * 4) 없으면 새 사용자(비밀번호 없음) + 연결
 */
@Service
@RequiredArgsConstructor
public class SocialAccountService {

    public static final String EMAIL_NOT_AVAILABLE = "email_not_available";
    public static final String ACCOUNT_CONFLICT = "account_conflict";
    static final int NAME_MAX = 50;

    private final UserRepository userRepository;
    private final UserIdentityRepository identityRepository;

    @Transactional
    public Long resolveUserId(SocialProfile profile) {
        Optional<UserIdentity> linked = identityRepository
                .findByProviderAndProviderUserId(profile.provider(), profile.providerUserId());
        if (linked.isPresent()) {
            linked.get().updateLogin(profile.login());
            return linked.get().getUser().getId();
        }

        if (profile.email() == null || profile.email().isBlank() || !profile.emailVerified()) {
            throw error(EMAIL_NOT_AVAILABLE, "verified email not available");
        }
        String email = profile.email().trim().toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            if (identityRepository.findByUserIdAndProvider(user.getId(), profile.provider()).isPresent()) {
                throw error(ACCOUNT_CONFLICT, "email already linked to another " + profile.provider() + " account");
            }
        } else {
            user = userRepository.save(User.social(email, displayName(profile, email)));
        }

        identityRepository.save(new UserIdentity(user, profile.provider(), profile.providerUserId(), profile.login()));
        return user.getId();
    }

    static String displayName(SocialProfile profile, String email) {
        String name = firstNonBlank(profile.name(), profile.login(), email.substring(0, email.indexOf('@') > 0 ? email.indexOf('@') : email.length()));
        return name.length() > NAME_MAX ? name.substring(0, NAME_MAX) : name;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "사용자";
    }

    private static OAuth2AuthenticationException error(String code, String description) {
        return new OAuth2AuthenticationException(new OAuth2Error(code, description, null), description);
    }
}
