package com.devflow.auth.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.devflow.user.entity.User;
import com.devflow.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

class SocialAccountServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final UserIdentityRepository identities = mock(UserIdentityRepository.class);
    private final SocialAccountService service = new SocialAccountService(users, identities);

    private SocialProfile github(String email, boolean verified) {
        return new SocialProfile("GITHUB", "9001", "octo", "Octo", email, verified);
    }

    private static String code(Throwable e) {
        return ((OAuth2AuthenticationException) e).getError().getErrorCode();
    }

    @Test
    void 인증된_이메일이_없으면_email_not_available() {
        given(identities.findByProviderAndProviderUserId("GITHUB", "9001")).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.resolveUserId(github("a@b.c", false)))
                .satisfies(e -> assertThat(code(e)).isEqualTo("email_not_available"));
        assertThatThrownBy(() -> service.resolveUserId(github(null, true)))
                .satisfies(e -> assertThat(code(e)).isEqualTo("email_not_available"));
        verify(users, never()).save(any());
    }

    @Test
    void 같은_이메일_계정에_같은_제공자의_다른_계정이_있으면_account_conflict() {
        User existing = mock(User.class);
        given(existing.getId()).willReturn(1L);
        given(identities.findByProviderAndProviderUserId("GITHUB", "9001")).willReturn(Optional.empty());
        given(users.findByEmail("smoke@devflow.dev")).willReturn(Optional.of(existing));
        given(identities.findByUserIdAndProvider(1L, "GITHUB")).willReturn(Optional.of(mock(UserIdentity.class)));

        assertThatThrownBy(() -> service.resolveUserId(github("Smoke@DevFlow.dev", true)))
                .satisfies(e -> assertThat(code(e)).isEqualTo("account_conflict"));
    }

    @Test
    void 이름이_없으면_아이디_그것도_없으면_이메일_앞부분() {
        assertThat(SocialAccountService.displayName(new SocialProfile("GITHUB", "1", "octo", null, "x@y.z", true), "x@y.z"))
                .isEqualTo("octo");
        assertThat(SocialAccountService.displayName(new SocialProfile("GOOGLE", "1", null, " ", "jimin@y.z", true), "jimin@y.z"))
                .isEqualTo("jimin");
    }
}
