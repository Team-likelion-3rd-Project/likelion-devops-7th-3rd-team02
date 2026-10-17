package com.devflow.auth.oauth;

import com.devflow.global.entity.BaseTimeEntity;
import com.devflow.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 사용자 ↔ GitHub·Google 계정 연결 (ERD 4.6). 제공자 접근 토큰은 저장하지 않는다 */
@Getter
@Entity
@Table(name = "user_identities")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserIdentity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** GITHUB / GOOGLE */
    @Column(nullable = false, length = 20)
    private String provider;

    @Column(name = "provider_user_id", nullable = false, length = 100)
    private String providerUserId;

    /** GitHub 아이디 (커밋·PR 작성자와 팀원 연결에 사용 가능) */
    @Column(name = "provider_login", length = 100)
    private String providerLogin;

    public UserIdentity(User user, String provider, String providerUserId, String providerLogin) {
        this.user = user;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.providerLogin = providerLogin;
    }

    public void updateLogin(String providerLogin) {
        this.providerLogin = providerLogin;
    }
}
