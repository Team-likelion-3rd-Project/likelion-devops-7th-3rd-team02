package com.devflow.auth.service;

import com.devflow.auth.dto.LoginRequest;
import com.devflow.auth.dto.LoginResponse;
import com.devflow.auth.dto.SignupRequest;
import com.devflow.auth.dto.SignupResponse;
import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.jwt.JwtTokenProvider;
import com.devflow.user.entity.User;
import com.devflow.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public SignupResponse signup(SignupRequest request) {

        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }

        String encodedPassword = passwordEncoder.encode(request.password());

        User user = new User(
                request.email(),
                encodedPassword,
                request.name()
        );

        User savedUser = userRepository.save(user);

        return SignupResponse.from(savedUser);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(
                        () -> new BusinessException(
                                ErrorCode.INVALID_CREDENTIALS
                        )
                );

        if (!passwordEncoder.matches(
                request.password(),
                user.getPassword()
        )) {
            throw new BusinessException(
                    ErrorCode.INVALID_CREDENTIALS
            );
        }

        String accessToken = jwtTokenProvider.createToken(
                user.getId(),
                user.getEmail()
        );

        return LoginResponse.of(accessToken);
    }
}